import json
from urllib import error, request

from fastapi import HTTPException, status

from app.config import settings


def is_mercado_pago_test_mode() -> bool:
    return settings.mercado_pago_access_token.strip().startswith("TEST-")


def get_mercado_pago_token_prefix() -> str:
    access_token = settings.mercado_pago_access_token.strip()

    if access_token.startswith("TEST-"):
        return "TEST"

    if access_token.startswith("APP_USR"):
        return "APP_USR"

    return "unknown"


def get_mercado_pago_mode() -> str:
    return "test" if is_mercado_pago_test_mode() else "production"


def get_mercado_pago_payer_email(user_email: str) -> str:
    test_payer_email = settings.mercado_pago_test_payer_email.strip()

    if is_mercado_pago_test_mode() and test_payer_email:
        return test_payer_email

    return user_email


def get_mercado_pago_payer_email_source() -> str:
    if (
        is_mercado_pago_test_mode()
        and settings.mercado_pago_test_payer_email.strip()
    ):
        return "test_override"

    return "user_email"


def should_send_x_scope_stage() -> bool:
    return is_mercado_pago_test_mode()


def build_mercado_pago_headers() -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {settings.mercado_pago_access_token}",
        "Content-Type": "application/json",
    }

    if should_send_x_scope_stage():
        headers["X-scope"] = "stage"

    return headers


def build_safe_mercado_pago_checkout_log_context(
    external_reference: str,
    endpoint: str,
) -> dict[str, object]:
    return {
        "mercado_pago_mode": get_mercado_pago_mode(),
        "token_configured": bool(settings.mercado_pago_access_token.strip()),
        "token_prefix": get_mercado_pago_token_prefix(),
        "payer_email_source": get_mercado_pago_payer_email_source(),
        "external_reference": external_reference,
        "endpoint": endpoint,
        "has_x_scope_stage": should_send_x_scope_stage(),
    }


def create_preapproval(payload: dict) -> dict:
    return mercado_pago_request("/preapproval", method="POST", payload=payload)


def fetch_preapproval(provider_subscription_id: str) -> dict:
    return mercado_pago_request(f"/preapproval/{provider_subscription_id}")


def cancel_preapproval(provider_subscription_id: str) -> dict:
    return mercado_pago_request(
        f"/preapproval/{provider_subscription_id}",
        method="PUT",
        payload={"status": "cancelled"},
    )


def mercado_pago_request(
    path: str,
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    if not settings.mercado_pago_access_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Checkout Mercado Pago ainda não configurado.",
        )

    request_body = None if payload is None else json.dumps(payload).encode("utf-8")
    api_request = request.Request(
        f"{settings.mercado_pago_base_url.rstrip('/')}{path}",
        data=request_body,
        method=method,
        headers=build_mercado_pago_headers(),
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
