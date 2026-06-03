import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from urllib import error, request
from uuid import uuid4

from fastapi import HTTPException, status

from app.config import settings
from app.schemas import (
    SubscriptionCheckoutResponse,
    SubscriptionRecord,
    SubscriptionStatusResponse,
    UserResponse,
)
from app.storage import (
    get_subscription_record,
    get_subscription_record_by_provider_subscription_id,
    upsert_subscription_record,
)

ACCESS_STATUSES = {"trial_active", "active"}
MERCADO_PAGO_PROVIDER = "mercado_pago"


def get_subscription_status(user: UserResponse) -> SubscriptionStatusResponse:
    subscription = get_or_create_subscription_record(user.id)
    subscription = refresh_time_based_status(subscription)

    return to_subscription_status_response(subscription)


def start_trial(user: UserResponse) -> SubscriptionStatusResponse:
    subscription = get_or_create_subscription_record(user.id)

    if subscription.trial_start_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este teste grátis já foi iniciado nesta conta.",
        )

    now = datetime.now(timezone.utc)
    trial_end_at = now + timedelta(days=settings.subscription_trial_days)

    subscription = subscription.model_copy(
        update={
            "trial_start_at": now,
            "trial_end_at": trial_end_at,
            "subscription_status": "trial_active",
            "updated_at": now,
        },
    )

    saved_subscription = upsert_subscription_record(subscription)

    return to_subscription_status_response(saved_subscription)


def create_subscription_checkout(user: UserResponse) -> SubscriptionCheckoutResponse:
    subscription = refresh_time_based_status(get_or_create_subscription_record(user.id))

    if subscription.subscription_status == "active":
        return SubscriptionCheckoutResponse(
            checkout_url=subscription.checkout_url or settings.frontend_url,
            provider=MERCADO_PAGO_PROVIDER,
            provider_subscription_id=subscription.provider_subscription_id,
            status=subscription.subscription_status,
            message="Sua assinatura já está ativa.",
        )

    if not settings.mercado_pago_access_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Checkout Mercado Pago ainda não configurado. "
                "Defina MERCADO_PAGO_ACCESS_TOKEN no backend."
            ),
        )

    response_data = create_mercado_pago_preapproval(
        user,
        include_free_trial=subscription.trial_start_at is None,
    )
    now = datetime.now(timezone.utc)
    provider_subscription_id = str(response_data.get("id") or "")
    checkout_url = str(response_data.get("init_point") or "")

    if not provider_subscription_id or not checkout_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Mercado Pago não retornou o checkout da assinatura.",
        )

    saved_subscription = upsert_subscription_record(
        subscription.model_copy(
            update={
                "subscription_status": normalize_provider_status(
                    str(response_data.get("status") or "pending"),
                    subscription,
                ),
                "subscription_provider": MERCADO_PAGO_PROVIDER,
                "provider_subscription_id": provider_subscription_id,
                "provider_customer_id": stringify_optional(response_data.get("payer_id")),
                "checkout_url": checkout_url,
                "updated_at": now,
            },
        )
    )

    return SubscriptionCheckoutResponse(
        checkout_url=checkout_url,
        provider=MERCADO_PAGO_PROVIDER,
        provider_subscription_id=saved_subscription.provider_subscription_id,
        status=saved_subscription.subscription_status,
        message="Checkout criado com segurança no Mercado Pago.",
    )


def refresh_subscription_from_provider(user: UserResponse) -> SubscriptionStatusResponse:
    subscription = get_or_create_subscription_record(user.id)

    if (
        subscription.subscription_provider != MERCADO_PAGO_PROVIDER
        or not subscription.provider_subscription_id
    ):
        return to_subscription_status_response(refresh_time_based_status(subscription))

    return to_subscription_status_response(
        update_subscription_from_mercado_pago(subscription.provider_subscription_id),
    )


def handle_mercado_pago_webhook(
    payload: dict,
    query: dict[str, str],
    headers: dict[str, str],
) -> None:
    validate_mercado_pago_webhook_signature(payload, query, headers)

    provider_subscription_id = extract_provider_subscription_id(payload, query)

    if not provider_subscription_id:
        return

    update_subscription_from_mercado_pago(provider_subscription_id)


def get_or_create_subscription_record(user_id: str) -> SubscriptionRecord:
    subscription = get_subscription_record(user_id)

    if subscription is not None:
        return subscription

    now = datetime.now(timezone.utc)

    return upsert_subscription_record(
        SubscriptionRecord(
            id=str(uuid4()),
            user_id=user_id,
            trial_start_at=None,
            trial_end_at=None,
            subscription_status="inactive",
            subscription_provider=None,
            provider_customer_id=None,
            provider_subscription_id=None,
            current_period_start=None,
            current_period_end=None,
            cancel_at_period_end=False,
            checkout_url=None,
            created_at=now,
            updated_at=now,
        )
    )


def refresh_time_based_status(subscription: SubscriptionRecord) -> SubscriptionRecord:
    now = datetime.now(timezone.utc)

    if (
        subscription.subscription_status == "trial_active"
        and subscription.trial_end_at is not None
        and subscription.trial_end_at <= now
    ):
        return upsert_subscription_record(
            subscription.model_copy(
                update={
                    "subscription_status": "trial_expired",
                    "updated_at": now,
                },
            )
        )

    if (
        subscription.subscription_status == "canceled"
        and subscription.current_period_end is not None
        and subscription.current_period_end > now
    ):
        return subscription

    return subscription


def update_subscription_from_mercado_pago(
    provider_subscription_id: str,
) -> SubscriptionRecord:
    response_data = fetch_mercado_pago_preapproval(provider_subscription_id)
    subscription = get_subscription_record_by_provider_subscription_id(
        provider_subscription_id,
    )

    external_reference = str(response_data.get("external_reference") or "")

    if subscription is None and external_reference:
        subscription = get_or_create_subscription_record(external_reference)

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assinatura local não encontrada para este evento.",
        )

    now = datetime.now(timezone.utc)

    return upsert_subscription_record(
        subscription.model_copy(
            update={
                "subscription_status": normalize_provider_status(
                    str(response_data.get("status") or "pending"),
                    subscription,
                ),
                "subscription_provider": MERCADO_PAGO_PROVIDER,
                "provider_customer_id": stringify_optional(response_data.get("payer_id")),
                "provider_subscription_id": str(response_data.get("id") or provider_subscription_id),
                "current_period_start": parse_provider_datetime(
                    response_data.get("date_created"),
                ),
                "current_period_end": parse_provider_datetime(
                    response_data.get("next_payment_date"),
                ),
                "checkout_url": stringify_optional(response_data.get("init_point"))
                or subscription.checkout_url,
                "updated_at": now,
            },
        )
    )


def create_mercado_pago_preapproval(
    user: UserResponse,
    include_free_trial: bool,
) -> dict:
    auto_recurring = {
        "frequency": 1,
        "frequency_type": "months",
        "transaction_amount": settings.subscription_monthly_price,
        "currency_id": settings.subscription_currency_id,
    }

    if include_free_trial:
        auto_recurring["free_trial"] = {
            "frequency": settings.subscription_trial_days,
            "frequency_type": "days",
        }

    payload = {
        "reason": "My Expenses - assinatura mensal",
        "external_reference": user.id,
        "payer_email": user.email,
        "back_url": f"{settings.frontend_url}/app?checkout=subscription_return",
        "auto_recurring": auto_recurring,
        "status": "pending",
    }

    return mercado_pago_request("/preapproval", method="POST", payload=payload)


def fetch_mercado_pago_preapproval(provider_subscription_id: str) -> dict:
    return mercado_pago_request(f"/preapproval/{provider_subscription_id}")


def mercado_pago_request(
    path: str,
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    request_body = None if payload is None else json.dumps(payload).encode("utf-8")
    api_request = request.Request(
        f"{settings.mercado_pago_api_base_url.rstrip('/')}{path}",
        data=request_body,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.mercado_pago_access_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with request.urlopen(api_request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Mercado Pago recusou a solicitação: {detail}",
        ) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível conectar ao Mercado Pago agora.",
        ) from exc


def normalize_provider_status(
    provider_status: str,
    subscription: SubscriptionRecord,
) -> str:
    normalized_status = provider_status.strip().lower()

    if normalized_status in {"authorized", "active"}:
        return "active"

    if normalized_status in {"paused", "past_due"}:
        return "past_due"

    if normalized_status in {"cancelled", "canceled"}:
        return "canceled"

    if subscription.subscription_status == "trial_active":
        return "trial_active"

    if subscription.subscription_status == "trial_expired":
        return "trial_expired"

    return "inactive"


def to_subscription_status_response(
    subscription: SubscriptionRecord,
) -> SubscriptionStatusResponse:
    now = datetime.now(timezone.utc)
    trial_days_remaining = 0

    if subscription.trial_end_at and subscription.trial_end_at > now:
        remaining = subscription.trial_end_at - now
        trial_days_remaining = max(0, remaining.days + (1 if remaining.seconds else 0))

    can_access_app = subscription.subscription_status in ACCESS_STATUSES or (
        subscription.subscription_status == "canceled"
        and subscription.current_period_end is not None
        and subscription.current_period_end > now
    )

    return SubscriptionStatusResponse(
        id=subscription.id,
        user_id=subscription.user_id,
        status=subscription.subscription_status,
        can_access_app=can_access_app,
        can_start_trial=subscription.trial_start_at is None,
        trial_start_at=subscription.trial_start_at,
        trial_end_at=subscription.trial_end_at,
        trial_days_remaining=trial_days_remaining,
        monthly_price=settings.subscription_monthly_price,
        currency_id=settings.subscription_currency_id,
        provider=subscription.subscription_provider,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        checkout_url=subscription.checkout_url,
        message=get_subscription_message(subscription.subscription_status),
    )


def get_subscription_message(subscription_status: str) -> str:
    messages = {
        "trial_active": "Seu teste grátis está ativo.",
        "active": "Sua assinatura está ativa.",
        "trial_expired": "Seu teste grátis terminou.",
        "past_due": "Há uma pendência na sua assinatura.",
        "canceled": "Sua assinatura foi cancelada.",
        "inactive": "Comece seu teste grátis para usar o My Expenses completo.",
    }

    return messages.get(subscription_status, messages["inactive"])


def extract_provider_subscription_id(
    payload: dict,
    query: dict[str, str],
) -> str:
    data = payload.get("data")

    if isinstance(data, dict) and data.get("id"):
        return str(data["id"])

    for key in ("id", "preapproval_id", "subscription_id"):
        if payload.get(key):
            return str(payload[key])

        if query.get(key):
            return str(query[key])

    return ""


def validate_mercado_pago_webhook_signature(
    payload: dict,
    query: dict[str, str],
    headers: dict[str, str],
) -> None:
    if not settings.mercado_pago_webhook_secret:
        return

    signature_parts = parse_signature_header(headers.get("x-signature", ""))
    timestamp = signature_parts.get("ts")
    received_signature = signature_parts.get("v1")
    request_id = headers.get("x-request-id", "")
    data_id = get_webhook_data_id(payload, query)

    if not timestamp or not received_signature or not request_id or not data_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook Mercado Pago sem assinatura válida.",
        )

    manifest = f"id:{data_id};request-id:{request_id};ts:{timestamp};"
    expected_signature = hmac.new(
        settings.mercado_pago_webhook_secret.encode("utf-8"),
        manifest.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, received_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook Mercado Pago com assinatura inválida.",
        )


def parse_signature_header(signature_header: str) -> dict[str, str]:
    signature_parts: dict[str, str] = {}

    for part in signature_header.split(","):
        key, separator, value = part.strip().partition("=")

        if separator:
            signature_parts[key] = value

    return signature_parts


def get_webhook_data_id(payload: dict, query: dict[str, str]) -> str:
    for key in ("data.id", "id", "preapproval_id", "subscription_id"):
        if query.get(key):
            return query[key]

    data = payload.get("data")

    if isinstance(data, dict) and data.get("id"):
        return str(data["id"])

    return ""


def parse_provider_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    normalized_value = value.replace("Z", "+00:00")

    try:
        parsed_value = datetime.fromisoformat(normalized_value)
    except ValueError:
        return None

    if parsed_value.tzinfo is None:
        return parsed_value.replace(tzinfo=timezone.utc)

    return parsed_value


def stringify_optional(value: object) -> str | None:
    if value is None or value == "":
        return None

    return str(value)
