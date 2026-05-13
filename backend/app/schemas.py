from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)
    date: date


class ExpenseUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=2, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=2, max_length=50)
    date: date


class ExpenseResponse(BaseModel):
    id: str
    description: str
    amount: float
    category: str
    date: date
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    message: str