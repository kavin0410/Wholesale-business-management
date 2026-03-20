"""Order routes — auto stock decrease + auto delivery creation + RBAC."""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import OrderCreate, ApiResponse, PaginatedResponse
from auth_middleware import require_permission, require_role

router = APIRouter(prefix="/orders", tags=["Orders"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(require_permission("orders:view")),
):
    conn = get_db()
    offset = (page - 1) * limit
    total = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    rows = conn.execute("""
        SELECT o.*, c.name AS customer_name, p.name AS product_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN products p ON o.product_id = p.id
        ORDER BY o.id DESC LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    conn.close()
    return PaginatedResponse(data=[dict(r) for r in rows], total=total, page=page, limit=limit)


@router.post("", response_model=ApiResponse, status_code=201)
def create_order(
    body: OrderCreate,
    user: dict = Depends(require_permission("orders:create")),
):
    conn = get_db()
    # Validate product + stock
    prod = conn.execute("SELECT * FROM products WHERE id=?", (body.product_id,)).fetchone()
    if not prod:
        conn.close()
        raise HTTPException(404, "Product not found")
    if prod["stock"] < body.quantity:
        conn.close()
        raise HTTPException(400, f"Insufficient stock (available: {prod['stock']})")

    # Validate customer
    cust = conn.execute("SELECT id FROM customers WHERE id=?", (body.customer_id,)).fetchone()
    if not cust:
        conn.close()
        raise HTTPException(404, "Customer not found")

    # Calculate totals
    subtotal = prod["price"] * body.quantity
    discount_pct = body.discount
    if body.seasonal:
        discount_pct += 10
    discount_pct = min(discount_pct, 100)
    discount_amt = subtotal * (discount_pct / 100)
    total = subtotal - discount_amt
    profit = (prod["price"] - prod["cost_price"]) * body.quantity - discount_amt
    now = datetime.now().strftime("%Y-%m-%d")

    cur = conn.execute(
        """INSERT INTO orders (customer_id,product_id,staff_id,quantity,discount,discount_amt,total,profit,status,payment_method,razorpay_id,date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (body.customer_id, body.product_id, user["id"], body.quantity, discount_pct, discount_amt, total, profit, 
         "Paid" if body.razorpay_id else "Pending", body.payment_method, body.razorpay_id, now)
    )
    order_id = cur.lastrowid

    # Decrease stock
    conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (body.quantity, body.product_id))
    
    # Update Staff Performance
    conn.execute("""
        UPDATE staff_performance 
        SET total_orders = total_orders + 1, 
            total_sales_amount = total_sales_amount + ?,
            last_updated = ?
        WHERE staff_id = ?
    """, (total, datetime.now().isoformat(), user["id"]))

    # If it's a prepaid order (Razorpay), also record the payment immediately
    if body.razorpay_id:
        conn.execute(
            "INSERT INTO payments (order_id, customer_id, staff_id, amount, method, transaction_id, date) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            (order_id, body.customer_id, user["id"], total, body.payment_method, body.razorpay_id, now)
        )
        conn.execute("""
            UPDATE staff_performance SET total_payments = total_payments + 1 WHERE staff_id = ?
        """, (user["id"],))

    logger.info("Stock updated: product_id=%d decreased by %d (by %s)", body.product_id, body.quantity, user["username"])

    # Auto-create delivery record
    now_ts = datetime.now().isoformat()
    expected = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    cur2 = conn.execute(
        """INSERT INTO deliveries (order_id,status,assigned_staff,expected_date,created_at,updated_at)
           VALUES (?,?,?,?,?,?)""",
        (order_id, "Packing Order", None, expected, now_ts, now_ts)
    )
    delivery_id = cur2.lastrowid
    conn.execute(
        "INSERT INTO delivery_timeline (delivery_id,status,timestamp,note) VALUES (?,?,?,?)",
        (delivery_id, "Packing Order", now_ts, "Order created, packing started")
    )

    conn.commit()
    conn.close()
    logger.info("Order created by %s: id=%d total=%.2f", user["username"], order_id, total)
    return ApiResponse(
        data={"id": order_id, "total": total, "profit": profit, "delivery_id": delivery_id},
        message="Order placed successfully"
    )


@router.put("/{order_id}/status", response_model=ApiResponse)
def update_order_status(
    order_id: int,
    status: str = Query(...),
    user: dict = Depends(require_permission("orders:edit")),
):
    valid = ("Pending", "Delivered", "Cancelled")
    if status not in valid:
        raise HTTPException(400, f"Status must be one of {valid}")
    conn = get_db()
    exists = conn.execute("SELECT id FROM orders WHERE id=?", (order_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Order not found")
    conn.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    conn.commit()
    conn.close()
    return ApiResponse(data={"id": order_id, "status": status}, message=f"Order #{order_id} marked {status}")


@router.delete("/{order_id}", response_model=ApiResponse)
def delete_order(
    order_id: int,
    user: dict = Depends(require_permission("orders:delete")),
):
    conn = get_db()
    exists = conn.execute("SELECT id FROM orders WHERE id=?", (order_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Order not found")
    conn.execute("DELETE FROM delivery_timeline WHERE delivery_id IN (SELECT id FROM deliveries WHERE order_id=?)", (order_id,))
    conn.execute("DELETE FROM deliveries WHERE order_id=?", (order_id,))
    conn.execute("DELETE FROM orders WHERE id=?", (order_id,))
    conn.commit()
    conn.close()
    logger.info("Order deleted by %s: id=%d", user["username"], order_id)
    return ApiResponse(message="Order deleted")
