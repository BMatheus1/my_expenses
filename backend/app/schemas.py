from datetime import date, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime
    email_verified: bool = False
    provider: str = "credentials"


class UserRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    password_hash: str | None = None
    provider: str = "credentials"
    created_at: datetime
    email_verified: bool = False


class RefreshTokenRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime
    revoked_at: datetime | None = None


class PasswordResetTokenRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime
    used_at: datetime | None = None


class EmailVerificationTokenRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime
    used_at: datetime | None = None


class AuthRegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str = Field(min_length=8, max_length=72)
    terms_accepted: bool = Field(default=False)

    @field_validator("name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized_name = " ".join(value.split())

        if len(normalized_name) < 3:
            raise ValueError("Informe seu nome completo.")

        if not any(character.isalpha() for character in normalized_name):
            raise ValueError("O nome precisa conter letras.")

        return normalized_name

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        has_letter = any(character.isalpha() for character in value)
        has_number = any(character.isdigit() for character in value)

        if not has_letter or not has_number:
            raise ValueError("A senha precisa ter letras e números.")

        return value

    @model_validator(mode="after")
    def validate_registration(self):
        if self.password != self.confirm_password:
            raise ValueError("A confirmação de senha não confere.")

        if not self.terms_accepted:
            raise ValueError("Você precisa aceitar os termos para criar a conta.")

        return self


class AuthLoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=10)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=300)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        has_letter = any(character.isalpha() for character in value)
        has_number = any(character.isdigit() for character in value)

        if not has_letter or not has_number:
            raise ValueError("A senha precisa ter letras e números.")

        return value


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=20, max_length=300)


class ResendVerificationEmailRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr


class DeleteAccountRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    confirmation: str = Field(min_length=7, max_length=20)
    password: str | None = Field(default=None, max_length=72)
    google_credential: str | None = Field(default=None, min_length=10)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


class ExpenseCategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=50)


class ExpenseCategoryUpdate(ExpenseCategoryCreate):
    pass


class ExpenseCategoryResponse(BaseModel):
    id: str | None = None
    name: str
    is_default: bool = False
    is_custom: bool = False
    is_used: bool = False
    can_edit: bool = False
    can_delete: bool = False


class ExpenseCategoryRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    name_normalized: str
    created_at: datetime


class CreditCardBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=40)
    brand: str = Field(min_length=2, max_length=24)
    last_four_digits: str = Field(min_length=4, max_length=4)
    closing_day: int = Field(ge=1, le=31)
    due_day: int = Field(ge=1, le=31)
    limit_amount: float | None = Field(default=None, ge=0)
    color: str = Field(default="slate", min_length=2, max_length=20)

    @field_validator("last_four_digits")
    @classmethod
    def validate_last_four_digits(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Informe apenas os 4 últimos números do cartão.")

        return value


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardUpdate(CreditCardBase):
    pass


class CreditCardResponse(CreditCardBase):
    id: str
    created_at: datetime


class CreditCardRecord(CreditCardBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime


class CreditCardSummaryResponse(BaseModel):
    id: str | None = None
    name: str
    brand: str
    last_four_digits: str
    color: str
    due_day: int
    is_deleted: bool = False


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)
    date: date
    payment_method: str = Field(default="pix", min_length=2, max_length=30)
    credit_card_id: str | None = None
    installments_count: int = Field(default=1, ge=1, le=48)


class ExpenseUpdate(ExpenseCreate):
    pass


class ExpenseResponse(BaseModel):
    id: str
    description: str
    amount: float
    category: str
    date: date
    created_at: datetime
    payment_method: str = "pix"
    credit_card_id: str | None = None
    credit_card: CreditCardSummaryResponse | None = None
    installments_count: int = 1
    installment_number: int = 1
    installment_group_id: str | None = None
    invoice_month: str | None = None


class ExpenseRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    description: str
    amount: float
    category: str
    date: date
    created_at: datetime
    payment_method: str = "pix"
    credit_card_id: str | None = None
    installments_count: int = 1
    installment_number: int = 1
    installment_group_id: str | None = None
    invoice_month: str | None = None
    credit_card_name: str | None = None
    credit_card_brand: str | None = None
    credit_card_last_four_digits: str | None = None
    credit_card_color: str | None = None
    credit_card_due_day: int | None = None
    credit_card_is_deleted: bool = False


class IncomeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0)
    source: str = Field(min_length=2, max_length=50)
    date: date


class IncomeUpdate(IncomeCreate):
    pass


class IncomeResponse(BaseModel):
    id: str
    description: str
    amount: float
    source: str
    date: date
    created_at: datetime


class IncomeRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    description: str
    amount: float
    source: str
    date: date
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    message: str