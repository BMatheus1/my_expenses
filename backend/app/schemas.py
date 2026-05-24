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


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)
    date: date


class ExpenseUpdate(ExpenseCreate):
    pass


class ExpenseResponse(BaseModel):
    id: str
    description: str
    amount: float
    category: str
    date: date
    created_at: datetime


class ExpenseRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    description: str
    amount: float
    category: str
    date: date
    created_at: datetime


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