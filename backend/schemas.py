"""
SupplyNest — Pydantic Schemas
Request/response models for API validation.
"""
from pydantic import BaseModel, Field
from typing import Any, Optional, List
from datetime import date


# ── Generic API Response ─────────────────────────────
class ApiResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = ""


# ── Auth ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    model_config = {"from_attributes": True}


# ── Suppliers ────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    phone: str = ""
    address: str = ""

class SupplierOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    address: Optional[str]
    model_config = {"from_attributes": True}


# ── Products ─────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    category: str = ""
    price: float = 0
    cost_price: float = 0
    stock: int = 0
    supplier_id: Optional[int] = None

class ProductOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    price: float
    cost_price: float
    stock: int
    supplier_id: Optional[int]
    supplier_name: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Customers ────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    address: str = ""

class CustomerOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    address: Optional[str]
    model_config = {"from_attributes": True}


# ── Order Items ──────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    subtotal: float
    model_config = {"from_attributes": True}


# ── Orders ───────────────────────────────────────────
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate]

class OrderOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    order_date: date
    total_amount: float
    items: List[OrderItemOut] = []
    payment_status: Optional[str] = None
    model_config = {"from_attributes": True}



# ── Payments ─────────────────────────────────────────
class PaymentUpdate(BaseModel):
    amount: float
    payment_status: str
    payment_date: date

class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: float
    payment_status: str
    payment_date: date
    customer_name: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Dashboard Summary ────────────────────────────────
class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: float


# ── AI ───────────────────────────────────────────────
class AIRecommendation(BaseModel):
    recommended_products: List[dict]
    confidence_score: float
    reason: str


# ── Pagination ───────────────────────────────────────
class PaginatedResponse(BaseModel):
    success: bool = True
    data: List[Any]
    total: int
    page: int
    limit: int
    message: str = ""
