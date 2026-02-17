"""Dashboard stats route."""
from fastapi import APIRouter
from database import get_db
from models import ApiResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=ApiResponse)
def dashboard_stats():
    conn = get_db()
    products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    total_sales = conn.execute("SELECT COALESCE(SUM(total),0) FROM orders").fetchone()[0]
    total_cost = conn.execute("""
        SELECT COALESCE(SUM(p.cost_price * o.quantity), 0)
        FROM orders o JOIN products p ON o.product_id = p.id
    """).fetchone()[0]
    total_paid = conn.execute("SELECT COALESCE(SUM(amount),0) FROM payments").fetchone()[0]

    low_stock = conn.execute(
        "SELECT id, name, stock FROM products WHERE stock <= 10 ORDER BY stock"
    ).fetchall()

    recent = conn.execute("""
        SELECT o.id, o.date, o.quantity, o.total,
               c.name AS customer_name, p.name AS product_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN products p ON o.product_id = p.id
        ORDER BY o.id DESC LIMIT 5
    """).fetchall()

    conn.close()
    profit = total_sales - total_cost
    return ApiResponse(data={
        "total_products": products,
        "total_customers": customers,
        "total_orders": orders,
        "total_sales": total_sales,
        "total_cost": total_cost,
        "total_profit": profit,
        "profit_margin": round((profit / total_sales * 100), 1) if total_sales else 0,
        "total_paid": total_paid,
        "pending_amount": total_sales - total_paid,
        "low_stock": [dict(r) for r in low_stock],
        "recent_orders": [dict(r) for r in recent],
    })
