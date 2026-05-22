import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

from app.config import settings


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Redefinição de senha - My Expenses"

    text_body = f"""
Olá!

Recebemos uma solicitação para redefinir a senha da sua conta no My Expenses.

Clique no link abaixo para criar uma nova senha:

{reset_url}

Este link expira em {settings.password_reset_token_expire_minutes} minutos.

Se você não solicitou a redefinição de senha, ignore este e-mail.

Equipe My Expenses
""".strip()

    html_body = build_action_email_html(
        title="Redefinição de senha",
        intro="Recebemos uma solicitação para redefinir a senha da sua conta no My Expenses.",
        action_label="Criar nova senha",
        action_url=reset_url,
        expiration_text=(
            f"Este link expira em {settings.password_reset_token_expire_minutes} minutos."
        ),
        footer_text="Se você não solicitou a redefinição de senha, ignore este e-mail.",
    )

    send_email(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def send_email_verification_email(to_email: str, verification_url: str) -> None:
    subject = "Confirme seu e-mail - My Expenses"

    text_body = f"""
Olá!

Obrigado por criar sua conta no My Expenses.

Para ativar sua conta, confirme seu e-mail acessando o link abaixo:

{verification_url}

Este link expira em {settings.email_verification_token_expire_minutes} minutos.

Se você não criou uma conta no My Expenses, ignore este e-mail.

Equipe My Expenses
""".strip()

    html_body = build_action_email_html(
        title="Confirme seu e-mail",
        intro="Obrigado por criar sua conta no My Expenses. Para ativar sua conta, confirme seu e-mail.",
        action_label="Confirmar e-mail",
        action_url=verification_url,
        expiration_text=(
            f"Este link expira em {settings.email_verification_token_expire_minutes} minutos."
        ),
        footer_text="Se você não criou uma conta no My Expenses, ignore este e-mail.",
    )

    send_email(
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def send_email(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> None:
    if not settings.smtp_enabled:
        print_email_preview(to_email, subject, text_body)
        return

    validate_smtp_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.smtp_from_name, str(settings.smtp_from_email)))
    message["To"] = to_email

    message.set_content(text_body)

    if html_body:
        message.add_alternative(html_body, subtype="html")

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

    if not settings.smtp_username:
        missing_fields.append("SMTP_USERNAME")

    if not settings.smtp_password:
        missing_fields.append("SMTP_PASSWORD")

    if missing_fields:
        raise RuntimeError(
            f"Configuração SMTP incompleta: {', '.join(missing_fields)}"
        )


def build_action_email_html(
    title: str,
    intro: str,
    action_label: str,
    action_url: str,
    expiration_text: str,
    footer_text: str,
) -> str:
    safe_title = escape(title)
    safe_intro = escape(intro)
    safe_action_label = escape(action_label)
    safe_action_url = escape(action_url, quote=True)
    safe_expiration_text = escape(expiration_text)
    safe_footer_text = escape(footer_text)

    return f"""
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{safe_title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 20px 32px;">
                <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#047857;">
                  My Expenses
                </p>

                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#0c0a09;">
                  {safe_title}
                </h1>

                <p style="margin:18px 0 0 0;font-size:15px;line-height:1.7;color:#57534e;">
                  {safe_intro}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 32px 28px 32px;">
                <a href="{safe_action_url}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;border-radius:999px;">
                  {safe_action_label}
                </a>

                <p style="margin:22px 0 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                  {safe_expiration_text}
                </p>

                <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>

                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#047857;">
                  {safe_action_url}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">
                  {safe_footer_text}
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:18px 0 0 0;font-size:12px;color:#a8a29e;">
            © My Expenses
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()


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