from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from time import monotonic

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import RequestResponseEndpoint

from app.config import settings


@dataclass
class RateLimitBucket:
    attempts: int
    reset_at: float


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, RateLimitBucket] = {}

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = monotonic()
        self._cleanup_expired_buckets(now)

        bucket = self._buckets.get(key)

        if bucket is None or now >= bucket.reset_at:
            self._buckets[key] = RateLimitBucket(
                attempts=1,
                reset_at=now + window_seconds,
            )
            return

        bucket.attempts += 1

        if bucket.attempts <= max_requests:
            return

        retry_after_seconds = max(1, ceil(bucket.reset_at - now))

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.",
            headers={"Retry-After": str(retry_after_seconds)},
        )

    def _cleanup_expired_buckets(self, now: float) -> None:
        expired_keys = [
            key for key, bucket in self._buckets.items() if now >= bucket.reset_at
        ]

        for key in expired_keys:
            del self._buckets[key]


rate_limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client is None:
        return "unknown"

    return request.client.host


def build_rate_limit_dependency(
    name: str,
    max_requests: int,
    window_seconds: int,
):
    async def enforce_rate_limit(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return

        client_ip = get_client_ip(request)
        key = f"{name}:{client_ip}"
        rate_limiter.check(key, max_requests, window_seconds)

    return enforce_rate_limit


auth_rate_limit = build_rate_limit_dependency(
    name="auth",
    max_requests=settings.auth_rate_limit_requests,
    window_seconds=settings.auth_rate_limit_window_seconds,
)

write_rate_limit = build_rate_limit_dependency(
    name="write",
    max_requests=settings.write_rate_limit_requests,
    window_seconds=settings.write_rate_limit_window_seconds,
)


async def security_middleware(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    blocked_response = block_large_request(request)

    if blocked_response is not None:
        return blocked_response

    response = await call_next(request)
    apply_security_headers(response)

    return response


def block_large_request(request: Request) -> JSONResponse | None:
    content_length = request.headers.get("content-length")

    if not content_length:
        return None

    try:
        request_size = int(content_length)
    except ValueError:
        return None

    if request_size <= settings.max_request_body_bytes:
        return None

    return JSONResponse(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        content={"detail": "Requisição grande demais."},
    )


def apply_security_headers(response: Response) -> None:
    if not settings.security_headers_enabled:
        return

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"

    if settings.is_production:
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'none'; "
            "form-action 'none'"
        )

        if settings.hsts_enabled:
            response.headers["Strict-Transport-Security"] = (
                f"max-age={settings.hsts_max_age_seconds}; includeSubDomains; preload"
            )