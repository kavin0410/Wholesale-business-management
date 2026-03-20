"""
Pydantic request/response models — consistent API contract.
"""
from pydantic import BaseModel, Field
from typing import Any, Optional, List


# ── Generic wrapper ──────────────────────────────────
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
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"

class StaffOut(BaseModel):
    id: int
    username: str
    role: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"

class StaffCreate(BaseModel):
    username: str
    password: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    role: str = "staff"

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class StaffPerformanceOut(BaseModel):
    staff_id: int
    username: str
    name: Optional[str]
    total_orders: int
    total_sales_amount: float
    total_payments: int
    last_updated: Optional[str]


# ── Products ─────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    category: str = ""
    cost_price: float = 0
    price: float = 0
    stock: int = 0
    supplier_id: Optional[int] = None

class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    cost_price: float
    price: float
    stock: int
    supplier_id: Optional[int]
    supplier_name: Optional[str] = None


# ── Suppliers ────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""

class SupplierOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    address: str


# ── Customers ────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""

class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    address: str


# ── Orders ───────────────────────────────────────────
class OrderCreate(BaseModel):
    customer_id: int
    product_id: int
    quantity: int = Field(gt=0)
    discount: float = 0
    seasonal: bool = False
    payment_method: str = "Cash"
    razorpay_id: Optional[str] = None

class OrderOut(BaseModel):
    id: int
    customer_id: int
    product_id: int
    quantity: int
    discount: float
    discount_amt: float
    total: float
    profit: float
    status: str
    date: str
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    payment_method: Optional[str] = "Cash"
    razorpay_id: Optional[str] = None


# ── Payments ─────────────────────────────────────────
class PaymentCreate(BaseModel):
    order_id: int
    amount: float = Field(gt=0)
    method: str
    transaction_id: Optional[str] = None

class PaymentOut(BaseModel):
    id: int
    order_id: int
    customer_id: int
    amount: float
    method: str
    date: str
    customer_name: Optional[str] = None


# ── Delivery ─────────────────────────────────────────
class DeliveryOut(BaseModel):
    id: int
    order_id: int
    status: str
    assigned_staff: Optional[str]
    expected_date: Optional[str]
    created_at: str
    updated_at: str

class DeliveryStatusUpdate(BaseModel):
    status: str
    role: str  # 'admin' or 'staff'

class TimelineEntry(BaseModel):
    status: str
    timestamp: str
    note: Optional[str] = None

class DeliveryTrack(BaseModel):
    order_details: dict
    customer_details: dict
    supplier_details: dict
    delivery_details: dict


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
