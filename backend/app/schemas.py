from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class UserRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    password_hash: str | None = None
    provider: str = "credentials"
    created_at: datetime


class AuthRegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        has_letter = any(character.isalpha() for character in value)
        has_number = any(character.isdigit() for character in value)

        if not has_letter or not has_number:
            raise ValueError("A senha precisa ter letras e números.")

        return value


class AuthLoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=10)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


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