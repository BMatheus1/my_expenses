from fastapi import Depends, HTTPException, status

from app.auth import get_current_user
from app.schemas import UserResponse
from app.subscription_service import get_subscription_status


def require_active_subscription(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    subscription = get_subscription_status(current_user)

    if not subscription.can_access_app:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Inicie o teste grátis ou regularize sua assinatura para continuar.",
        )

    return current_user
