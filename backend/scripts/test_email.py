import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(ENV_FILE)

from app.email_service import send_email


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(
            "Uso: python scripts/test_email.py seu-email@exemplo.com"
        )

    to_email = sys.argv[1]

    send_email(
        to_email=to_email,
        subject="Teste de envio - My Expenses",
        text_body=(
            "Olá!\n\n"
            "Este é um teste de envio SMTP do My Expenses.\n\n"
            "Se você recebeu este e-mail, a configuração SMTP está funcionando."
        ),
        html_body="""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c1917;">
          <h1 style="color:#047857;">Teste de envio - My Expenses</h1>
          <p>Olá!</p>
          <p>Este é um teste de envio SMTP do My Expenses.</p>
          <p><strong>Se você recebeu este e-mail, a configuração SMTP está funcionando.</strong></p>
        </div>
        """,
    )

    print(f"E-mail de teste enviado para {to_email}.")


if __name__ == "__main__":
    main()