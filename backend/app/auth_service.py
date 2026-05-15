from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.auth import (
    create_access_token,
    hash_password,
    verify_google_credential,
    verify_password,
)
from app.schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    GoogleLoginRequest,
    UserRecord,
    UserResponse,
)
from app.storage import create_user_record, get_user_record_by_email


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


def build_auth_response(user: UserRecord) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user.model_dump()),
    )


def normalize_email(email: str) -> str:
    return email.strip().lower()


def raise_invalid_credentials_error() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="E-mail ou senha inválidos.",
    )