from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import HTTPException, status

from app.auth import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    verify_google_credential,
    verify_password,
)
from app.config import settings
from app.email_service import send_password_reset_email
from app.password_reset_repository import (
    create_password_reset_token_record,
    get_active_password_reset_token_record,
    mark_password_reset_token_as_used,
    revoke_user_password_reset_tokens,
    update_user_password_hash,
)
from app.schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    PasswordResetTokenRecord,
    ResetPasswordRequest,
    UserRecord,
    UserResponse,
)
from app.session_repository import (
    get_active_refresh_token_record,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token_by_hash,
    revoke_refresh_token_record,
)
from app.storage import create_user_record, get_user_record_by_email, get_user_record_by_id

PASSWORD_RESET_TOKEN_BYTES = 48

PASSWORD_RESET_GENERIC_MESSAGE = (
    "Se existir uma conta com este e-mail, enviaremos as instruções de recuperação."
)


def register_user(user_data: AuthRegisterRequest) -> AuthResponse:
    email = normalize_email(user_data.email)

    existing_user = get_user_record_by_email(email)

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta com este e-mail.",
        )

    user = UserRecord(
        id=str(uuid4()),
        name=user_data.name,
        email=email,
        password_hash=hash_password(user_data.password),
        provider="credentials",
        created_at=datetime.now(timezone.utc),
    )

    created_user = create_user_record(user)

    return build_auth_response(created_user)


def login_user(login_data: AuthLoginRequest) -> AuthResponse:
    email = normalize_email(login_data.email)
    user = get_user_record_by_email(email)

    if user is None or user.password_hash is None:
        raise_invalid_credentials_error()

    if not verify_password(login_data.password, user.password_hash):
        raise_invalid_credentials_error()

    return build_auth_response(user)


def login_with_google(login_data: GoogleLoginRequest) -> AuthResponse:
    google_user = verify_google_credential(login_data.credential)

    email = normalize_email(google_user["email"])
    name = google_user.get("name") or email.split("@")[0]

    user = get_user_record_by_email(email)

    if user is None:
        user = create_user_record(
            UserRecord(
                id=str(uuid4()),
                name=name,
                email=email,
                password_hash=None,
                provider="google",
                created_at=datetime.now(timezone.utc),
            )
        )

    return build_auth_response(user)


def request_password_reset(reset_data: ForgotPasswordRequest) -> str:
    email = normalize_email(reset_data.email)
    user = get_user_record_by_email(email)

    if user is None:
        return PASSWORD_RESET_GENERIC_MESSAGE

    now = datetime.now(timezone.utc)
    raw_token = create_password_reset_token()
    token_hash = hash_password_reset_token(raw_token)

    revoke_user_password_reset_tokens(user.id, now)

    create_password_reset_token_record(
        PasswordResetTokenRecord(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(
                minutes=settings.password_reset_token_expire_minutes
            ),
            created_at=now,
            used_at=None,
        )
    )

    reset_url = build_password_reset_url(raw_token)
    send_password_reset_email(user.email, reset_url)

    return PASSWORD_RESET_GENERIC_MESSAGE


def reset_user_password(reset_data: ResetPasswordRequest) -> None:
    now = datetime.now(timezone.utc)
    token_hash = hash_password_reset_token(reset_data.token)
    reset_record = get_active_password_reset_token_record(token_hash, now)

    if reset_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de recuperação inválido ou expirado.",
        )

    update_user_password_hash(
        user_id=reset_record.user_id,
        password_hash=hash_password(reset_data.password),
    )

    mark_password_reset_token_as_used(reset_record.id, now)
    revoke_user_password_reset_tokens(reset_record.user_id, now)
    revoke_all_user_refresh_tokens(reset_record.user_id, now)


def refresh_user_session(refresh_token: str) -> AuthResponse:
    now = datetime.now(timezone.utc)
    token_hash = hash_refresh_token(refresh_token)
    refresh_record = get_active_refresh_token_record(token_hash, now)

    if refresh_record is None:
        raise_invalid_session_error()

    user = get_user_record_by_id(refresh_record.user_id)

    if user is None:
        revoke_refresh_token_record(refresh_record.id, now)
        raise_invalid_session_error()

    revoke_refresh_token_record(refresh_record.id, now)

    return build_auth_response(user)


def logout_refresh_session(refresh_token: str | None) -> None:
    if not refresh_token:
        return

    revoke_refresh_token_by_hash(
        token_hash=hash_refresh_token(refresh_token),
        revoked_at=datetime.now(timezone.utc),
    )


def build_auth_response(user: UserRecord) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user.model_dump()),
    )


def create_password_reset_token() -> str:
    return token_urlsafe(PASSWORD_RESET_TOKEN_BYTES)


def hash_password_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def build_password_reset_url(token: str) -> str:
    return f"{settings.frontend_url}/?reset_token={token}"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def raise_invalid_credentials_error() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="E-mail ou senha inválidos.",
    )


def raise_invalid_session_error() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Faça login novamente.",
    )