from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class UserRecord(UserResponse):
    password_hash: str | None = None
    provider: str = "credentials"


class AuthRegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class AuthLoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=10)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


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


class ExpenseRecord(ExpenseResponse):
    user_id: str


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


class IncomeRecord(IncomeResponse):
    user_id: str


class HealthResponse(BaseModel):
    status: str
    message: str