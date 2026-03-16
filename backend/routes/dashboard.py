"""Dashboard routes — stats and summary with SQLAlchemy ORM."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Product, Customer, Order, OrderItem, Payment
from schemas import ApiResponse

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard-summary", response_model=ApiResponse)
def dashboard_summary(db: Session = Depends(get_db)):
    """Simple dashboard summary: total products, customers, orders, revenue."""
    total_products = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar()

    return ApiResponse(data={
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
    })


@router.get("/dashboard/stats", response_model=ApiResponse)
def dashboard_stats(db: Session = Depends(get_db)):
    """Detailed dashboard stats — backward compatible with existing frontend."""
    total_products = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()
    total_sales = float(db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar())
    total_paid = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar())

    # Calculate total cost from order items
    total_cost = float(
        db.query(func.coalesce(func.sum(Product.cost_price * OrderItem.quantity), 0))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .scalar()
    )

    profit = total_sales - total_cost

    # Low stock products
    low_stock = db.query(Product).filter(Product.stock <= 10).order_by(Product.stock).all()
    low_stock_data = [{"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock]

    # Recent orders (top 5)
    recent_orders = db.query(Order).order_by(Order.id.desc()).limit(5).all()
    recent_data = []
    for o in recent_orders:
        product_names = ", ".join([item.product.name for item in o.order_items if item.product])
        recent_data.append({
            "id": o.id,
            "date": str(o.order_date),
            "total": o.total_amount,
            "customer_name": o.customer.name if o.customer else None,
            "product_name": product_names,
        })

    return ApiResponse(data={
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_sales": total_sales,
        "total_cost": total_cost,
        "total_profit": profit,
        "profit_margin": round((profit / total_sales * 100), 1) if total_sales else 0,
        "total_paid": total_paid,
        "pending_amount": total_sales - total_paid,
        "low_stock": low_stock_data,
        "recent_orders": recent_data,
    })
