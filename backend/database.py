"""
SupplyNest — Database Setup (SQLite + SQLAlchemy ORM)
Connection, session management, table creation, and sample data seeding.
"""
import os
import logging
from datetime import datetime, date

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, Session

from models import Base, Supplier, Product, Customer, Order, OrderItem, Payment, User

# ── Config ────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "supplynest_v2.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

logger = logging.getLogger("supplynest")

# ── Engine & Session ──────────────────────────────────
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and auto-closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    logger.info("All tables created / verified in SQLite database '%s'", DB_PATH)


# ── Security Helper (for seeding users) ──────────────
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)


# ── Seed Sample Data ─────────────────────────────────
def seed_sample_data():
    """Insert sample data only if the tables are empty."""
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(Supplier).first() is not None:
            logger.info("Sample data already exists — skipping seed")
            return

        # ── Users (insert only if not present) ─────────
        for uname, pw, role in [("admin", "admin123", "admin"), ("staff", "staff123", "staff")]:
            logger.info("Seeding user: %s with password: %s", uname, pw)
            existing = db.query(User).filter(User.username == uname).first()
            if not existing:
                hashed_pw = get_password_hash(pw)
                logger.info("Hashed password for %s: %s", uname, hashed_pw)
                db.add(User(username=uname, password=hashed_pw, role=role))
        db.flush()

        # ── Suppliers ─────────────────────────────────
        suppliers = [
            Supplier(name="Metro Wholesale Traders", phone="9876543210", address="12 Market Road, Chennai"),
            Supplier(name="Global Food Supplies", phone="9123456780", address="45 Industrial Area, Mumbai"),
            Supplier(name="FreshAgro Distributors", phone="9988776655", address="78 Farm Lane, Pune"),
        ]
        db.add_all(suppliers)
        db.flush()

        # ── Products ─────────────────────────────────
        products = [
            Product(name="Basmati Rice (25kg)", category="Grains", price=1200.00, cost_price=950.00, stock=150, supplier_id=suppliers[0].id),
            Product(name="Wheat Flour (50kg)", category="Grains", price=1800.00, cost_price=1400.00, stock=200, supplier_id=suppliers[0].id),
            Product(name="Sunflower Oil (15L)", category="Oils", price=2100.00, cost_price=1750.00, stock=80, supplier_id=suppliers[1].id),
            Product(name="Sugar (50kg)", category="Essentials", price=1750.00, cost_price=1500.00, stock=120, supplier_id=suppliers[1].id),
            Product(name="Toor Dal (30kg)", category="Pulses", price=2400.00, cost_price=2000.00, stock=95, supplier_id=suppliers[2].id),
            Product(name="Red Chilli Powder (10kg)", category="Spices", price=1100.00, cost_price=850.00, stock=60, supplier_id=suppliers[2].id),
            Product(name="Turmeric Powder (10kg)", category="Spices", price=900.00, cost_price=700.00, stock=75, supplier_id=suppliers[2].id),
            Product(name="Salt (50kg)", category="Essentials", price=450.00, cost_price=300.00, stock=300, supplier_id=suppliers[0].id),
            Product(name="Moong Dal (25kg)", category="Pulses", price=2200.00, cost_price=1850.00, stock=65, supplier_id=suppliers[2].id),
            Product(name="Groundnut Oil (15L)", category="Oils", price=2500.00, cost_price=2100.00, stock=50, supplier_id=suppliers[1].id),
        ]
        db.add_all(products)
        db.flush()

        # ── Customers ────────────────────────────────
        customers = [
            Customer(name="Ravi Kumar", phone="9001122334", address="23 Gandhi Nagar, Trichy"),
            Customer(name="Priya Sharma", phone="9112233445", address="56 MG Road, Bangalore"),
            Customer(name="Arjun Patel", phone="9223344556", address="89 Station Road, Ahmedabad"),
            Customer(name="Deepa Nair", phone="9334455667", address="12 Temple Street, Kochi"),
            Customer(name="Vikram Singh", phone="9445566778", address="34 Rajpath, Delhi"),
        ]
        db.add_all(customers)
        db.flush()

        # ── Orders + OrderItems ──────────────────────
        orders_data = [
            # (customer_index, [(product_index, quantity), ...])
            (0, [(0, 5), (3, 3)]),       # Ravi buys Rice + Sugar
            (1, [(2, 2), (5, 4)]),       # Priya buys Oil + Chilli
            (2, [(1, 10), (7, 20)]),     # Arjun buys Flour + Salt
            (3, [(4, 3), (6, 5)]),       # Deepa buys Toor Dal + Turmeric
            (4, [(8, 2), (9, 1)]),       # Vikram buys Moong Dal + Groundnut Oil
        ]

        orders = []
        for cust_idx, items_data in orders_data:
            total_amount = 0.0
            order_items = []
            for prod_idx, qty in items_data:
                prod = products[prod_idx]
                subtotal = prod.price * qty
                total_amount += subtotal
                order_items.append(OrderItem(
                    product_id=prod.id,
                    quantity=qty,
                    subtotal=subtotal,
                ))
                # Reduce stock
                prod.stock -= qty

            order = Order(
                customer_id=customers[cust_idx].id,
                order_date=date.today(),
                total_amount=total_amount,
            )
            db.add(order)
            db.flush()

            for item in order_items:
                item.order_id = order.id
            db.add_all(order_items)
            orders.append(order)

        db.flush()

        # ── Payments (mix of Paid and Pending) ───────
        payments = [
            Payment(order_id=orders[0].id, amount=orders[0].total_amount, payment_status="Paid", payment_date=date.today()),
            Payment(order_id=orders[1].id, amount=orders[1].total_amount, payment_status="Paid", payment_date=date.today()),
            Payment(order_id=orders[2].id, amount=orders[2].total_amount / 2, payment_status="Partial", payment_date=date.today()),
            Payment(order_id=orders[3].id, amount=0, payment_status="Pending", payment_date=date.today()),
            Payment(order_id=orders[4].id, amount=orders[4].total_amount, payment_status="Paid", payment_date=date.today()),
        ]
        db.add_all(payments)

        db.commit()
        logger.info("Sample data seeded successfully!")

    except Exception as e:
        db.rollback()
        logger.error("Error seeding sample data: %s", e)
        raise
    finally:
        db.close()
