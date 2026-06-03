from fastapi import Depends, HTTPException, status

from app.auth import get_current_user
from app.billing_service import user_has_paid_access
from app.schemas import UserResponse


def require_billing_access(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    if not user_has_paid_access(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Sua assinatura não está ativa. Para continuar usando o My Expenses, assine por R$ 8,99/mês.",
        )

    return current_user
