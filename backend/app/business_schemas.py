from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BusinessCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=80)
    type: str = Field(default="Outro", min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=250)


class BusinessUpdate(BusinessCreate):
    pass


class BusinessResponse(BaseModel):
    id: str
    name: str
    type: str
    description: str | None = None
    created_at: datetime


class BusinessMaterialCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    category: str = Field(default="Outros", min_length=2, max_length=60)
    stock_quantity: float = Field(gt=0)
    unit: str = Field(default="unidade", min_length=1, max_length=20)
    total_cost: float = Field(gt=0)
    supplier: str | None = Field(default=None, max_length=100)
    purchase_date: date
    notes: str | None = Field(default=None, max_length=300)


class BusinessMaterialUpdate(BusinessMaterialCreate):
    pass


class BusinessMaterialResponse(BaseModel):
    id: str
    business_id: str
    name: str
    category: str
    stock_quantity: float
    unit: str
    unit_cost: float
    total_cost: float
    supplier: str | None = None
    purchase_date: date
    notes: str | None = None
    created_at: datetime


class BusinessServiceCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    category: str = Field(default="Serviço", min_length=2, max_length=60)
    price: float = Field(gt=0)
    estimated_minutes: int | None = Field(default=None, ge=0, le=6000)
    notes: str | None = Field(default=None, max_length=300)


class BusinessServiceUpdate(BusinessServiceCreate):
    pass


class BusinessRecipeItemCreate(BaseModel):
    material_id: str = Field(min_length=8)
    quantity_used: float = Field(gt=0)


class BusinessRecipeItemUpdate(BaseModel):
    quantity_used: float = Field(gt=0)


class BusinessRecipeItemResponse(BaseModel):
    id: str
    service_id: str
    material_id: str
    material_name: str
    material_category: str
    quantity_used: float
    unit: str
    unit_cost: float
    stock_quantity: float
    total_cost: float
    created_at: datetime


class BusinessServiceResponse(BaseModel):
    id: str
    business_id: str
    name: str
    category: str
    price: float
    estimated_minutes: int | None = None
    notes: str | None = None
    created_at: datetime
    materials: list[BusinessRecipeItemResponse] = Field(default_factory=list)
    material_cost: float = 0
    gross_profit: float = 0
    gross_margin_percent: float = 0
    current_capacity: int | None = None


class BusinessSaleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    service_id: str = Field(min_length=8)
    quantity: int = Field(default=1, ge=1, le=9999)
    unit_price: float | None = Field(default=None, gt=0)
    sale_date: date
    payment_method: str = Field(default="Pix", min_length=2, max_length=40)
    notes: str | None = Field(default=None, max_length=300)


class BusinessSaleResponse(BaseModel):
    id: str
    business_id: str
    service_id: str
    service_name: str
    quantity: int
    unit_price: float
    total_amount: float
    total_material_cost: float
    gross_profit: float
    gross_margin_percent: float
    sale_date: date
    payment_method: str
    notes: str | None = None
    created_at: datetime


class BusinessDashboardSummary(BaseModel):
    total_sales: float
    total_material_cost: float
    gross_profit: float
    gross_margin_percent: float
    materials_count: int
    services_count: int
    low_stock_services_count: int


class BusinessDashboardResponse(BaseModel):
    business: BusinessResponse
    summary: BusinessDashboardSummary
    services: list[BusinessServiceResponse]
    recent_sales: list[BusinessSaleResponse]