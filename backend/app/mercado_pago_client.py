import json
from urllib import error, request

from fastapi import HTTPException, status

from app.config import settings


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
