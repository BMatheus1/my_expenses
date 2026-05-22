import smtplib
from email.message import EmailMessage

from app.config import settings


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Redefinição de senha - My Expenses"

    body = f"""
Olá!

Recebemos uma solicitação para redefinir a senha da sua conta no My Expenses.

Clique no link abaixo para criar uma nova senha:

{reset_url}

Este link expira em {settings.password_reset_token_expire_minutes} minutos.

Se você não solicitou a redefinição de senha, ignore este e-mail.

Equipe My Expenses
""".strip()

    send_email(
        to_email=to_email,
        subject=subject,
        body=body,
    )


def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_enabled:
        print_email_preview(to_email, subject, body)
        return

    validate_smtp_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()

        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)

        server.send_message(message)


def validate_smtp_settings() -> None:
    missing_fields = []

    if not settings.smtp_host:
        missing_fields.append("SMTP_HOST")

    if not settings.smtp_from_email:
        missing_fields.append("SMTP_FROM_EMAIL")

    if missing_fields:
        raise RuntimeError(
            f"Configuração SMTP incompleta: {', '.join(missing_fields)}"
        )


def print_email_preview(to_email: str, subject: str, body: str) -> None:
    if settings.is_production:
        raise RuntimeError("SMTP_ENABLED precisa estar ativo em produção.")

    print("\n" + "=" * 80)
    print("EMAIL SIMULADO - NÃO FOI ENVIADO DE VERDADE")
    print("=" * 80)
    print(f"Para: {to_email}")
    print(f"Assunto: {subject}")
    print("-" * 80)
    print(body)
    print("=" * 80 + "\n")