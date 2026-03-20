"""Reports & Analytics routes — Aggregated data for charts and PDF exports."""
from fastapi import APIRouter, Depends
from database import get_db
from models import ApiResponse
from auth_middleware import require_permission
from datetime import datetime, timedelta

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary", response_model=ApiResponse)
def report_summary(
    user: dict = Depends(require_permission("reports:view")),
):
    conn = get_db()
    
    # Best Product (Highest Profit)
    best_product_row = conn.execute("""
        SELECT p.name, SUM(o.profit) as total_profit
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY o.product_id
        ORDER BY total_profit DESC LIMIT 1
    """).fetchone()
    
    # Best Customer (Highest Spend)
    best_customer_row = conn.execute("""
        SELECT c.name, SUM(o.total) as total_spend
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        GROUP BY o.customer_id
        ORDER BY total_spend DESC LIMIT 1
    """).fetchone()
    
    # Total stats
    stats = conn.execute("""
        SELECT 
            COUNT(id) as total_orders,
            SUM(total) as total_revenue,
            SUM(profit) as total_profit
        FROM orders
    """).fetchone()

    conn.close()
    
    return ApiResponse(data={
        "best_product": best_product_row["name"] if best_product_row else "—",
        "best_customer": best_customer_row["name"] if best_customer_row else "—",
        "total_revenue": dict(stats)["total_revenue"] or 0,
        "total_orders": dict(stats)["total_orders"] or 0,
        "total_profit": dict(stats)["total_profit"] or 0,
    })


@router.get("/trends", response_model=ApiResponse)
def report_trends(
    user: dict = Depends(require_permission("reports:view")),
):
    conn = get_db()
    
    # Monthly Trends (last 12 months)
    # SQLite doesn't have robust date series, so we fetch and fill in app if needed, 
    # but here we'll just group by month
    trends = conn.execute("""
        SELECT 
            strftime('%Y-%m', date) as month,
            SUM(total) as revenue,
            COUNT(id) as orders
        FROM orders
        GROUP BY month
        ORDER BY month DESC LIMIT 12
    """).fetchall()
    
    # Weekly Trends (last 7 days of data)
    weekly = conn.execute("""
        SELECT 
            date,
            SUM(total) as revenue
        FROM orders
        WHERE date >= date('now', '-7 days')
        GROUP BY date
        ORDER BY date ASC
    """).fetchall()

    conn.close()
    
    return ApiResponse(data={
        "monthly": [dict(r) for r in trends][::-1], # chronologically
        "weekly": [dict(r) for r in weekly]
    })


@router.get("/categories", response_model=ApiResponse)
def report_categories(
    user: dict = Depends(require_permission("reports:view")),
):
    conn = get_db()
    cat_sales = conn.execute("""
        SELECT p.category, SUM(o.total) as sales
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY p.category
        ORDER BY sales DESC
    """).fetchall()
    conn.close()
    return ApiResponse(data=[dict(r) for r in cat_sales])
