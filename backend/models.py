"""
SupplyNest — SQLAlchemy ORM Models
All table definitions for MySQL database 'wholesale_db'.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


# ── Users ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(256), nullable=False)
    role = Column(String(50), nullable=False, default="staff")


# ── Suppliers ─────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20))
    address = Column(Text)

    # One Supplier → Many Products
    products = relationship("Product", back_populates="supplier")


# ── Products ─────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    price = Column(Float, nullable=False, default=0)
    cost_price = Column(Float, nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))

    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


# ── Customers ────────────────────────────────────────
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20))
    address = Column(Text)

    # One Customer → Many Orders
    orders = relationship("Order", back_populates="customer")


# ── Orders ───────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False, default=0)

    customer = relationship("Customer", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")


# ── Order Items ──────────────────────────────────────
class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False, default=0)

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")


# ── Payments ─────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    payment_status = Column(String(50), nullable=False, default="Pending")  # Paid, Pending, Partial
    payment_date = Column(Date, nullable=False)

    order = relationship("Order", back_populates="payment")
