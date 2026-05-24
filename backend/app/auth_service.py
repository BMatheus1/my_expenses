from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4
from app.account_repository import delete_user_account_data

from fastapi import HTTPException, status

from app.auth import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    verify_google_credential,
    verify_password,
)
from app.config import settings
from app.email_service import send_email_verification_email, send_password_reset_email
from app.email_verification_repository import (
    create_email_verification_token_record,
    get_active_email_verification_token_record,
    get_user_email_verified,
    mark_email_verification_token_as_used,
    mark_user_email_as_verified,
    revoke_user_email_verification_tokens,
)
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
    EmailVerificationTokenRecord,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    PasswordResetTokenRecord,
    ResendVerificationEmailRequest,
    ResetPasswordRequest,
    UserRecord,
    UserResponse,
    VerifyEmailRequest,
    DeleteAccountRequest,
)
from app.session_repository import (
    get_active_refresh_token_record,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token_by_hash,
    revoke_refresh_token_record,
)
from app.storage import create_user_record, get_user_record_by_email, get_user_record_by_id

PASSWORD_RESET_TOKEN_BYTES = 48
EMAIL_VERIFICATION_TOKEN_BYTES = 48

PROVIDER_CREDENTIALS = "credentials"
PROVIDER_GOOGLE = "google"

PASSWORD_RESET_GENERIC_MESSAGE = (
    "Se existir uma conta com este e-mail, enviaremos as instruções de recuperação."
)

EMAIL_VERIFICATION_GENERIC_MESSAGE = (
    "Se existir uma conta pendente com este e-mail, enviaremos um novo link de verificação."
)


def register_user(user_data: AuthRegisterRequest) -> str:
    email = normalize_email(user_data.email)
    existing_user = get_user_record_by_email(email)

    if existing_user is not None:
        raise_existing_account_error(existing_user.provider)

    user = UserRecord(
        id=str(uuid4()),
        name=user_data.name,
        email=email,
        password_hash=hash_password(user_data.password),
        provider=PROVIDER_CREDENTIALS,
        created_at=datetime.now(timezone.utc),
        email_verified=False,
    )

    created_user = create_user_record(user)
    request_email_verification_for_user(created_user)

    return (
        "Conta criada com sucesso. Enviamos um link para confirmar seu e-mail "
        "antes do primeiro acesso."
    )


def login_user(login_data: AuthLoginRequest) -> AuthResponse:
    email = normalize_email(login_data.email)
    user = get_user_record_by_email(email)

    if user is None:
        raise_invalid_credentials_error()

    if user.provider == PROVIDER_GOOGLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta foi criada com Google. Use Entrar com Google.",
        )

    if user.provider != PROVIDER_CREDENTIALS or user.password_hash is None:
        raise_invalid_credentials_error()

    if not get_user_email_verified(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirme seu e-mail antes de entrar. Enviamos um link de confirmação para sua caixa de entrada.",
        )

    if not verify_password(login_data.password, user.password_hash):
        raise_invalid_credentials_error()

    return build_auth_response(user)


def login_with_google(login_data: GoogleLoginRequest) -> AuthResponse:
    google_user = verify_google_credential(login_data.credential)

    email = normalize_email(google_user["email"])
    name = google_user.get("name") or email.split("@")[0]

    user = get_user_record_by_email(email)

    if user is not None and user.provider == PROVIDER_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta foi criada com e-mail e senha. Use o login normal.",
        )

    if user is None:
        user = create_user_record(
            UserRecord(
                id=str(uuid4()),
                name=name,
                email=email,
                password_hash=None,
                provider=PROVIDER_GOOGLE,
                created_at=datetime.now(timezone.utc),
                email_verified=True,
            )
        )

    mark_user_email_as_verified(user.id)

    return build_auth_response(user)


def verify_user_email(verification_data: VerifyEmailRequest) -> AuthResponse:
    now = datetime.now(timezone.utc)
    token_hash = hash_email_verification_token(verification_data.token)
    verification_record = get_active_email_verification_token_record(token_hash, now)

    if verification_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de verificação inválido ou expirado.",
        )

    user = get_user_record_by_id(verification_record.user_id)

    if user is None or user.provider != PROVIDER_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de verificação inválido ou expirado.",
        )

    mark_user_email_as_verified(user.id)
    mark_email_verification_token_as_used(verification_record.id, now)
    revoke_user_email_verification_tokens(user.id, now)

    verified_user = get_user_record_by_id(user.id)

    if verified_user is None:
        raise_invalid_session_error()

    return build_auth_response(verified_user)


def resend_verification_email(data: ResendVerificationEmailRequest) -> str:
    email = normalize_email(data.email)
    user = get_user_record_by_email(email)

    if user is None:
        return EMAIL_VERIFICATION_GENERIC_MESSAGE

    if user.provider != PROVIDER_CREDENTIALS:
        return EMAIL_VERIFICATION_GENERIC_MESSAGE

    if get_user_email_verified(user.id):
        return EMAIL_VERIFICATION_GENERIC_MESSAGE

    request_email_verification_for_user(user)

    return EMAIL_VERIFICATION_GENERIC_MESSAGE


def request_password_reset(reset_data: ForgotPasswordRequest) -> str:
    email = normalize_email(reset_data.email)
    user = get_user_record_by_email(email)

    if user is None:
        return PASSWORD_RESET_GENERIC_MESSAGE

    if user.provider != PROVIDER_CREDENTIALS or user.password_hash is None:
        return PASSWORD_RESET_GENERIC_MESSAGE

    if not get_user_email_verified(user.id):
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

    user = get_user_record_by_id(reset_record.user_id)

    if user is None or user.provider != PROVIDER_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de recuperação inválido ou expirado.",
        )

    if not get_user_email_verified(user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirme seu e-mail antes de redefinir a senha.",
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


def request_email_verification_for_user(user: UserRecord) -> None:
    now = datetime.now(timezone.utc)
    raw_token = create_email_verification_token()
    token_hash = hash_email_verification_token(raw_token)

    revoke_user_email_verification_tokens(user.id, now)

    create_email_verification_token_record(
        EmailVerificationTokenRecord(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(
                minutes=settings.email_verification_token_expire_minutes
            ),
            created_at=now,
            used_at=None,
        )
    )

    verification_url = build_email_verification_url(raw_token)
    send_email_verification_email(user.email, verification_url)


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


def create_email_verification_token() -> str:
    return token_urlsafe(EMAIL_VERIFICATION_TOKEN_BYTES)


def hash_email_verification_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def build_email_verification_url(token: str) -> str:
    return f"{settings.frontend_url}/?verify_email_token={token}"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def raise_existing_account_error(provider: str) -> None:
    if provider == PROVIDER_GOOGLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já possui uma conta criada com Google. Use Entrar com Google.",
        )

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Já existe uma conta com este e-mail. Faça login ou recupere sua senha.",
    )


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

def delete_current_user_account(
    user_id: str,
    delete_data: DeleteAccountRequest,
) -> str:
    user = get_user_record_by_id(user_id)

    if user is None:
        raise_invalid_session_error()

    if delete_data.confirmation.strip().upper() != "EXCLUIR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Digite EXCLUIR para confirmar a exclusão da conta.",
        )

    if user.provider == PROVIDER_CREDENTIALS:
        validate_credentials_account_deletion(user, delete_data)

    if user.provider == PROVIDER_GOOGLE:
        validate_google_account_deletion(user, delete_data)

    delete_user_account_data(user.id)

    return "Conta excluída com sucesso."

def validate_credentials_account_deletion(
    user: UserRecord,
    delete_data: DeleteAccountRequest,
) -> None:
    if not delete_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe sua senha para excluir a conta.",
        )

    if user.password_hash is None or not verify_password(
        delete_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta.",
        )


def validate_google_account_deletion(
    user: UserRecord,
    delete_data: DeleteAccountRequest,
) -> None:
    if not delete_data.google_credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirme sua identidade com Google para excluir a conta.",
        )

    google_user = verify_google_credential(delete_data.google_credential)
    google_email = normalize_email(google_user["email"])

    if google_email != normalize_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A conta Google confirmada não corresponde à conta atual.",
        )