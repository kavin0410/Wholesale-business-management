import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
import enum
import bcrypt
import jwt

# ==========================================
# CONFIGURATION & CONSTANTS
# ==========================================
SECRET_KEY = "super_secret_jwt_key_that_should_be_in_env_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
SQLALCHEMY_DATABASE_URL = "sqlite:///./wholesale_monolithic.db"

# ==========================================
# DATABASE SETUP (SQLAlchemy)
# ==========================================
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# ENUMS
# ==========================================
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"

# ==========================================
# DATABASE MODELS
# ==========================================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default=UserRole.STAFF)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders_managed = relationship("Order", back_populates="managed_by_user")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    contact_email = Column(String)
    contact_phone = Column(String)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="supplier")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    base_price = Column(Float, nullable=False)
    wholesale_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    category_id = Column(Integer, ForeignKey("categories.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    inventory_logs = relationship("InventoryLog", back_populates="product")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, nullable=False)
    contact_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    billing_address = Column(Text)
    shipping_address = Column(Text)
    credit_limit = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    managed_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default=OrderStatus.PENDING)
    total_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    final_amount = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")
    managed_by_user = relationship("User", back_populates="orders_managed")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String, unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    order = relationship("Order", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    change_amount = Column(Integer, nullable=False)
    reason = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    logged_by = Column(Integer, ForeignKey("users.id"))

    product = relationship("Product", back_populates="inventory_logs")

# ==========================================
# CREATE TABLES
# ==========================================
Base.metadata.create_all(bind=engine)

# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STAFF
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    class Config:
        orm_mode = True

class SupplierBase(BaseModel):
    name: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    base_price: float
    wholesale_price: float
    stock_quantity: int = 0
    reorder_level: int = 10
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class CustomerBase(BaseModel):
    company_name: str
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    credit_limit: float = 0.0

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    current_balance: float
    created_at: datetime
    class Config:
        orm_mode = True

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(OrderItemBase):
    id: int
    unit_price: float
    total_price: float
    class Config:
        orm_mode = True

class OrderBase(BaseModel):
    customer_id: int
    notes: Optional[str] = None
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    shipping_cost: float = 0.0

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderOut(OrderBase):
    id: int
    order_number: str
    managed_by: Optional[int] = None
    status: OrderStatus
    total_amount: float
    final_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut]
    class Config:
        orm_mode = True

class PaymentBase(BaseModel):
    order_id: Optional[int] = None
    customer_id: int
    amount: float
    payment_method: PaymentMethod
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentOut(PaymentBase):
    id: int
    receipt_number: str
    payment_date: datetime
    class Config:
        orm_mode = True

# ==========================================
# SECURITY & AUTHENTICATION UTILS
# ==========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Operation not permitted")
        return current_user
    return role_checker

# ==========================================
# ROUTERS - AUTHENTICATION
# ==========================================
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@auth_router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ==========================================
# ROUTERS - USERS
# ==========================================
users_router = APIRouter(prefix="/api/users", tags=["Users"])

@users_router.post("/", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_pwd,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@users_router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==========================================
# ROUTERS - PRODUCTS
# ==========================================
products_router = APIRouter(prefix="/api/products", tags=["Products"])

@products_router.post("/", response_model=ProductOut)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    db_product = Product(**product.dict())
    try:
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU already exists or invalid references.")
    return db_product

@products_router.get("/", response_model=List[ProductOut])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@products_router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# ==========================================
# ROUTERS - ORDERS
# ==========================================
orders_router = APIRouter(prefix="/api/orders", tags=["Orders"])

def calculate_order_totals(order_items: List[OrderItemCreate], db: Session) -> dict:
    total_amount = 0.0
    items_data = []
    for item in order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        
        line_total = product.wholesale_price * item.quantity
        total_amount += line_total
        items_data.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "unit_price": product.wholesale_price,
            "total_price": line_total
        })
    return {"total_amount": total_amount, "items": items_data}

@orders_router.post("/", response_model=OrderOut)
def place_order(order: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify Customer
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate Totals & Inventories
    totals = calculate_order_totals(order.items, db)
    base_total = totals["total_amount"]
    final_total = base_total + order.tax_amount + order.shipping_cost - order.discount_amount

    # Generate Order
    order_number = f"ORD-{secrets.token_hex(4).upper()}"
    new_order = Order(
        order_number=order_number,
        customer_id=order.customer_id,
        managed_by=current_user.id,
        total_amount=base_total,
        tax_amount=order.tax_amount,
        discount_amount=order.discount_amount,
        shipping_cost=order.shipping_cost,
        final_amount=final_total,
        notes=order.notes
    )
    db.add(new_order)
    db.flush() 

    # Order Line Items & Stock Deduction
    for item_data in totals["items"]:
        order_item = OrderItem(order_id=new_order.id, **item_data)
        db.add(order_item)
        
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        product.stock_quantity -= item_data["quantity"]
        
        inv_log = InventoryLog(
            product_id=product.id,
            change_amount=-item_data["quantity"],
            reason=f"Order Placed: {order_number}",
            logged_by=current_user.id
        )
        db.add(inv_log)

    customer.current_balance += final_total
    
    db.commit()
    db.refresh(new_order)
    return new_order

@orders_router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, status: OrderStatus, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            product.stock_quantity += item.quantity
            db.add(InventoryLog(
                product_id=product.id,
                change_amount=item.quantity,
                reason=f"Order Cancelled: {order.order_number}",
                logged_by=current_user.id
            ))
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        customer.current_balance -= order.final_amount

    order.status = status
    db.commit()
    db.refresh(order)
    return order


# ==========================================
# ROUTERS - CUSTOMERS & PAYMENTS
# ==========================================
customers_router = APIRouter(prefix="/api/customers", tags=["Customers"])

@customers_router.post("/", response_model=CustomerOut)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_cust = Customer(**customer.dict())
    db.add(db_cust)
    db.commit()
    db.refresh(db_cust)
    return db_cust

@customers_router.get("/", response_model=List[CustomerOut])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Customer).offset(skip).limit(limit).all()

payments_router = APIRouter(prefix="/api/payments", tags=["Payments"])

@payments_router.post("/", response_model=PaymentOut)
def record_payment(payment: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    receipt_number = f"REC-{secrets.token_hex(5).upper()}"
    new_payment = Payment(
        receipt_number=receipt_number,
        **payment.dict()
    )
    db.add(new_payment)
    
    customer.current_balance -= payment.amount
    
    db.commit()
    db.refresh(new_payment)
    return new_payment


# ==========================================
# MAIN APP CONFIGURATION
# ==========================================
app = FastAPI(
    title="Comprehensive Wholesale API",
    description="A complete backend infrastructure designed in one single file. It encompasses Models, Views, and Controllers, handling a massive range of Wholesale operations including JWT security.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(customers_router)
app.include_router(payments_router)

@app.get("/", tags=["Health"])
def root():
    return {"message": "Comprehensive Wholesale API is Up and Running!"}

@app.on_event("startup")
def create_initial_admin():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@wholesale.local").first()
    if not admin:
        new_admin = User(
            email="admin@wholesale.local",
            hashed_password=get_password_hash("admin123!"),
            full_name="Super Admin",
            role=UserRole.ADMIN
        )
        db.add(new_admin)
        db.commit()
    db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
