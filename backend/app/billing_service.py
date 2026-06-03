import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.billing_repository import (
    get_user_subscription,
    get_user_subscription_by_provider_subscription_id,
    insert_payment_event_once,
    list_trials_ending_within,
    list_user_subscriptions_by_status,
    list_users_without_subscription,
    upsert_user_subscription,
)
from app.billing_schemas import (
    BillingCheckoutResponse,
    BillingStatus,
    BillingStatusResponse,
    BillingWebhookResponse,
    UserSubscriptionRecord,
)
from app.config import settings
from app.mercado_pago_client import (
    cancel_preapproval,
    create_preapproval,
    fetch_preapproval,
)
from app.schemas import UserResponse

MERCADO_PAGO_PROVIDER = "mercado_pago"
PLAN_NAME = "My Expenses Premium"
ACCESS_STATUSES = {"trialing", "active"}


def get_billing_status(user: UserResponse) -> BillingStatusResponse:
    subscription = get_user_subscription(user.id)

    if subscription is None:
        return build_empty_billing_status()

    subscription = refresh_time_based_status(subscription)

    return to_billing_status_response(subscription)


def create_checkout(user: UserResponse) -> BillingCheckoutResponse:
    subscription = refresh_time_based_status(
        get_user_subscription(user.id) or create_pending_subscription(user.id),
    )

    if subscription.status in {"trialing", "active"}:
        return BillingCheckoutResponse(
            checkout_url=subscription.checkout_url or settings.app_public_url,
            status=subscription.status,
            provider_subscription_id=subscription.provider_subscription_id,
            message="Seu acesso já está liberado.",
        )

    response_data = create_preapproval(build_preapproval_payload(user, subscription))
    provider_subscription_id = str(response_data.get("id") or "")
    checkout_url = str(
        response_data.get("init_point")
        or response_data.get("sandbox_init_point")
        or ""
    )

    if not provider_subscription_id or not checkout_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Mercado Pago não retornou a URL de assinatura.",
        )

    now = datetime.now(timezone.utc)

    saved_subscription = upsert_user_subscription(
        subscription.model_copy(
            update={
                "provider": MERCADO_PAGO_PROVIDER,
                "provider_subscription_id": provider_subscription_id,
                "status": "pending",
                "plan_name": PLAN_NAME,
                "amount": settings.app_price_brl,
                "currency": "BRL",
                "checkout_url": checkout_url,
                "updated_at": now,
            },
        )
    )

    return BillingCheckoutResponse(
        checkout_url=checkout_url,
        status=saved_subscription.status,
        provider_subscription_id=saved_subscription.provider_subscription_id,
        message="Checkout criado com segurança no Mercado Pago.",
    )


def cancel_subscription(user: UserResponse) -> BillingStatusResponse:
    subscription = get_user_subscription(user.id)

    if subscription is None or not subscription.provider_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nenhuma assinatura Mercado Pago ativa foi encontrada.",
        )

    response_data = cancel_preapproval(subscription.provider_subscription_id)
    updated_subscription = update_subscription_from_provider_response(
        subscription,
        response_data,
        forced_status="canceled",
    )

    return to_billing_status_response(updated_subscription)


def handle_mercado_pago_webhook(
    payload: dict,
    query: dict[str, str],
    headers: dict[str, str],
) -> BillingWebhookResponse:
    validate_mercado_pago_webhook_signature(payload, query, headers)

    provider_event_id = extract_provider_event_id(payload, query, headers)
    event_type = extract_event_type(payload, query)

    payment_event = insert_payment_event_once(
        provider_event_id=provider_event_id,
        event_type=event_type,
        payload=payload,
    )

    if payment_event is None:
        return BillingWebhookResponse(
            duplicate=True,
            message="Evento duplicado ignorado.",
        )

    provider_subscription_id = extract_provider_subscription_id(payload, query)

    if not provider_subscription_id:
        return BillingWebhookResponse(message="Evento registrado sem assinatura.")

    response_data = fetch_preapproval(provider_subscription_id)
    subscription = get_user_subscription_by_provider_subscription_id(
        provider_subscription_id,
    )
    external_reference = str(response_data.get("external_reference") or "")

    if subscription is None and external_reference:
        subscription = get_user_subscription(external_reference)

    if subscription is None:
        return BillingWebhookResponse(message="Assinatura local não encontrada.")

    update_subscription_from_provider_response(subscription, response_data)

    return BillingWebhookResponse()


def user_has_paid_access(user_id: str) -> bool:
    subscription = get_user_subscription(user_id)

    if subscription is None:
        return False

    subscription = refresh_time_based_status(subscription)

    if subscription.status == "active":
        return True

    return (
        subscription.status == "trialing"
        and subscription.trial_ends_at is not None
        and subscription.trial_ends_at > datetime.now(timezone.utc)
    )


def get_billing_admin_lists() -> dict:
    return {
        "trialing": list_user_subscriptions_by_status("trialing"),
        "trials_ending_soon": list_trials_ending_within(days=7),
        "without_subscription": list_users_without_subscription(),
        "pending": list_user_subscriptions_by_status("pending"),
        "past_due": list_user_subscriptions_by_status("past_due"),
        "canceled": list_user_subscriptions_by_status("canceled"),
        "active": list_user_subscriptions_by_status("active"),
    }


def create_pending_subscription(user_id: str) -> UserSubscriptionRecord:
    now = datetime.now(timezone.utc)

    return upsert_user_subscription(
        UserSubscriptionRecord(
            id=str(uuid4()),
            user_id=user_id,
            provider=MERCADO_PAGO_PROVIDER,
            provider_subscription_id=None,
            provider_payment_id=None,
            status="pending",
            plan_name=PLAN_NAME,
            amount=settings.app_price_brl,
            currency="BRL",
            trial_starts_at=None,
            trial_ends_at=None,
            current_period_starts_at=None,
            current_period_ends_at=None,
            canceled_at=None,
            checkout_url=None,
            created_at=now,
            updated_at=now,
        )
    )


def refresh_time_based_status(
    subscription: UserSubscriptionRecord,
) -> UserSubscriptionRecord:
    now = datetime.now(timezone.utc)

    if (
        subscription.status == "trialing"
        and subscription.trial_ends_at is not None
        and subscription.trial_ends_at <= now
    ):
        return upsert_user_subscription(
            subscription.model_copy(
                update={
                    "status": "expired",
                    "updated_at": now,
                },
            )
        )

    return subscription


def build_preapproval_payload(
    user: UserResponse,
    subscription: UserSubscriptionRecord,
) -> dict:
    auto_recurring = {
        "frequency": 1,
        "frequency_type": "months",
        "transaction_amount": settings.app_price_brl,
        "currency_id": "BRL",
    }

    if subscription.trial_starts_at is None:
        auto_recurring["free_trial"] = {
            "frequency": settings.app_trial_days,
            "frequency_type": "days",
        }

    return {
        "reason": PLAN_NAME,
        "external_reference": user.id,
        "payer_email": user.email,
        "back_url": f"{settings.frontend_url}/app?checkout=billing_return",
        "auto_recurring": auto_recurring,
        "status": "pending",
    }


def update_subscription_from_provider_response(
    subscription: UserSubscriptionRecord,
    response_data: dict,
    forced_status: BillingStatus | None = None,
) -> UserSubscriptionRecord:
    now = datetime.now(timezone.utc)
    provider_status = str(response_data.get("status") or "")
    next_status = forced_status or map_provider_status(provider_status, subscription)
    trial_starts_at = subscription.trial_starts_at
    trial_ends_at = subscription.trial_ends_at

    if next_status == "trialing" and trial_ends_at is None:
        trial_starts_at = now
        trial_ends_at = parse_provider_datetime(
            response_data.get("next_payment_date"),
        ) or now + timedelta(days=settings.app_trial_days)

    return upsert_user_subscription(
        subscription.model_copy(
            update={
                "provider": MERCADO_PAGO_PROVIDER,
                "provider_subscription_id": str(
                    response_data.get("id") or subscription.provider_subscription_id or "",
                )
                or None,
                "provider_payment_id": stringify_optional(
                    response_data.get("last_charged_date")
                    or response_data.get("payment_id"),
                ),
                "status": next_status,
                "plan_name": PLAN_NAME,
                "amount": settings.app_price_brl,
                "currency": "BRL",
                "trial_starts_at": trial_starts_at,
                "trial_ends_at": trial_ends_at,
                "current_period_starts_at": parse_provider_datetime(
                    response_data.get("date_created"),
                )
                or subscription.current_period_starts_at,
                "current_period_ends_at": parse_provider_datetime(
                    response_data.get("next_payment_date"),
                )
                or subscription.current_period_ends_at,
                "canceled_at": now if next_status == "canceled" else subscription.canceled_at,
                "checkout_url": stringify_optional(response_data.get("init_point"))
                or subscription.checkout_url,
                "updated_at": now,
            },
        )
    )


def map_provider_status(
    provider_status: str,
    subscription: UserSubscriptionRecord,
) -> BillingStatus:
    normalized_status = provider_status.strip().lower()

    if normalized_status in {"authorized", "active"}:
        if subscription.trial_starts_at is None and settings.app_trial_days > 0:
            return "trialing"

        return "active"

    if normalized_status in {"pending", "in_process"}:
        return "pending" if subscription.status != "trialing" else "trialing"

    if normalized_status in {"paused", "past_due", "rejected"}:
        return "past_due"

    if normalized_status in {"cancelled", "canceled"}:
        return "canceled"

    if subscription.status in {"trialing", "active", "expired"}:
        return subscription.status

    return "unknown"


def to_billing_status_response(
    subscription: UserSubscriptionRecord,
) -> BillingStatusResponse:
    is_access_allowed = subscription.status in ACCESS_STATUSES and (
        subscription.status == "active"
        or (
            subscription.trial_ends_at is not None
            and subscription.trial_ends_at > datetime.now(timezone.utc)
        )
    )

    return BillingStatusResponse(
        status=subscription.status,
        plan_name=subscription.plan_name,
        amount=float(subscription.amount),
        currency=subscription.currency,
        trial_ends_at=subscription.trial_ends_at,
        current_period_ends_at=subscription.current_period_ends_at,
        is_access_allowed=is_access_allowed,
        can_cancel=bool(
            subscription.provider_subscription_id
            and subscription.status in {"trialing", "active", "pending", "past_due"}
        ),
        checkout_url=subscription.checkout_url,
        message=get_billing_message(subscription.status),
    )


def build_empty_billing_status() -> BillingStatusResponse:
    return BillingStatusResponse(
        status="none",
        plan_name=PLAN_NAME,
        amount=settings.app_price_brl,
        currency="BRL",
        is_access_allowed=False,
        can_cancel=False,
        message=get_billing_message("none"),
    )


def get_billing_message(billing_status: BillingStatus) -> str:
    messages = {
        "none": "Comece seu teste gratis de 1 mes. Depois, R$ 8,99/mes.",
        "trialing": "Teste grátis ativo.",
        "active": "Assinatura ativa.",
        "pending": "Comece seu teste grátis para usar o My Expenses completo.",
        "past_due": "Há uma pendência no pagamento.",
        "canceled": "Assinatura cancelada.",
        "expired": "Seu teste grátis terminou.",
        "unknown": "Não foi possível confirmar sua assinatura.",
    }

    return messages[billing_status]


def extract_provider_subscription_id(payload: dict, query: dict[str, str]) -> str:
    data = payload.get("data")

    if isinstance(data, dict) and data.get("id"):
        return str(data["id"])

    for key in ("data.id", "id", "preapproval_id", "subscription_id"):
        if query.get(key):
            return query[key]

        if key != "id" and payload.get(key):
            return str(payload[key])

    return ""


def extract_provider_event_id(
    payload: dict,
    query: dict[str, str],
    headers: dict[str, str],
) -> str:
    if payload.get("id"):
        return str(payload["id"])

    if query.get("id"):
        return query["id"]

    request_id = headers.get("x-request-id")
    resource_id = extract_provider_subscription_id(payload, query)

    return f"{request_id or 'no-request-id'}:{resource_id or 'no-resource-id'}"


def extract_event_type(payload: dict, query: dict[str, str]) -> str:
    return str(
        payload.get("type")
        or payload.get("action")
        or query.get("type")
        or "unknown",
    )


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
