"""Payment routes + RBAC."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import PaymentCreate, ApiResponse, PaginatedResponse
from auth_middleware import require_permission

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=PaginatedResponse)
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(require_permission("payments:view")),
):
    conn = get_db()
    offset = (page - 1) * limit
    total = conn.execute("SELECT COUNT(*) FROM payments").fetchone()[0]
    rows = conn.execute("""
        SELECT p.*, c.name AS customer_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.id DESC LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    conn.close()
    return PaginatedResponse(data=[dict(r) for r in rows], total=total, page=page, limit=limit)


@router.get("/summary", response_model=ApiResponse)
def payment_summary(
    user: dict = Depends(require_permission("payments:view")),
):
    conn = get_db()
    revenue = conn.execute("SELECT COALESCE(SUM(total),0) FROM orders").fetchone()[0]
    paid = conn.execute("SELECT COALESCE(SUM(amount),0) FROM payments").fetchone()[0]
    conn.close()
    return ApiResponse(data={"total_revenue": revenue, "total_paid": paid, "pending": revenue - paid})


@router.post("", response_model=ApiResponse, status_code=201)
def create_payment(
    body: PaymentCreate,
    user: dict = Depends(require_permission("payments:create")),
):
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id=?", (body.order_id,)).fetchone()
    if not order:
        conn.close()
        raise HTTPException(404, "Order not found")
    now = datetime.now().strftime("%Y-%m-%d")
    cur = conn.execute(
        "INSERT INTO payments (order_id,customer_id,amount,method,date) VALUES (?,?,?,?,?)",
        (body.order_id, order["customer_id"], body.amount, body.method, now)
    )
    conn.commit()
    pid = cur.lastrowid
    conn.close()
    return ApiResponse(data={"id": pid}, message="Payment recorded")
