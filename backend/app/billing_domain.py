from datetime import datetime, timezone

from app.billing_schemas import UserSubscriptionRecord

GRACE_PERIOD_DAYS = 2


def subscription_allows_access(subscription: UserSubscriptionRecord) -> bool:
    now = datetime.now(timezone.utc)

    if subscription.status == "active":
        return True

    if subscription.status == "trialing":
        return subscription.trial_ends_at is not None and subscription.trial_ends_at > now

    if subscription.status == "past_due":
        return (
            subscription.grace_period_ends_at is not None
            and subscription.grace_period_ends_at > now
        )

    return False


def get_billing_message(subscription: UserSubscriptionRecord) -> str:
    if subscription.status == "trialing":
        days_left = calculate_days_until(subscription.trial_ends_at) or 0
        return f"Você está no teste grátis. Faltam {days_left} dias."

    if subscription.status == "active":
        return "Sua assinatura está ativa."

    if subscription.status == "past_due":
        days_until_block = calculate_days_until(subscription.grace_period_ends_at) or 0
        return (
            "Não conseguimos confirmar seu pagamento. Você ainda pode usar o app "
            f"por {days_until_block} dias enquanto regulariza."
        )

    messages = {
        "pending": "Estamos aguardando a confirmação da sua assinatura.",
        "blocked": "Sua assinatura está pausada por pagamento pendente. Regularize para continuar usando o My Expenses.",
        "canceled": "Sua assinatura foi cancelada.",
        "expired": "Seu teste grátis terminou.",
        "unknown": "Não foi possível confirmar sua assinatura.",
    }

    return messages[subscription.status]


def calculate_days_until(value: datetime | None) -> int | None:
    if value is None:
        return None

    remaining_seconds = (value - datetime.now(timezone.utc)).total_seconds()

    if remaining_seconds <= 0:
        return 0

    return max(1, int((remaining_seconds + 86399) // 86400))
