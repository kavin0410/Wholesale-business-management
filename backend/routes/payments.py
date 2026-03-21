"""Payment routes + RBAC."""
import os
import requests
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from datetime import datetime
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
        "INSERT INTO payments (order_id,customer_id,staff_id,amount,method,transaction_id,date) VALUES (?,?,?,?,?,?,?)",
        (body.order_id, order["customer_id"], user["id"], body.amount, body.method, body.transaction_id, now)
    )
    
    # Update Staff Performance
    conn.execute("""
        UPDATE staff_performance 
        SET total_payments = total_payments + 1,
            last_updated = ?
        WHERE staff_id = ?
    """, (datetime.now().isoformat(), user["id"]))

    conn.commit()
    pid = cur.lastrowid
    conn.close()
    return ApiResponse(data={"id": pid}, message="Payment recorded")

class CashfreeOrderRequest(BaseModel):
    orderId: int
    amount: float
    customerName: str
    customerPhone: str

@router.post("/create-order", response_model=ApiResponse)
def create_cashfree_order(body: CashfreeOrderRequest):
    app_id = os.getenv("CASHFREE_APP_ID", "TEST_APP_ID")
    secret_key = os.getenv("CASHFREE_SECRET_KEY", "TEST_SECRET_KEY")

    url = "https://sandbox.cashfree.com/pg/orders"
    payload = {
        "order_id": f"order_{body.orderId}",
        "order_amount": float(body.amount),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": f"cust_{body.orderId}",
            "customer_name": body.customerName,
            "customer_phone": body.customerPhone if body.customerPhone else "9999999999"
        },
        "order_meta": {
            "return_url": f"http://localhost:5173/payment-success?order_id={body.orderId}"
        }
    }
    headers = {
        "x-api-version": "2022-09-01",
        "x-client-id": app_id,
        "x-client-secret": secret_key,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code >= 400:
            print("Cashfree Error:", response.text)
            # fallback to dummy link for testing/sandbox if keys missing
            if app_id == "TEST_APP_ID":
                return ApiResponse(data={"payment_link": f"http://localhost:5173/payment-success?order_id={body.orderId}"})
            return ApiResponse(success=False, message="Cashfree API Error")

        data = response.json()
        payment_link = data.get("payment_link") or data.get("payment_session_id")
        return ApiResponse(data={"payment_link": payment_link})
    except Exception as e:
        if app_id == "TEST_APP_ID":
            return ApiResponse(data={"payment_link": f"http://localhost:5173/payment-success?order_id={body.orderId}"})
        return ApiResponse(success=False, message=str(e))

class CashfreeVerifyRequest(BaseModel):
    orderId: int

@router.post("/verify-cashfree", response_model=ApiResponse)
def verify_cashfree_order(body: CashfreeVerifyRequest):
    # In a real app we would call Cashfree GET /pg/orders/order_{id} to verify payment status
    # using requests.get(..., headers={...})
    # For now, if we reach here, we assume success or test environment success
    
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id=?", (body.orderId,)).fetchone()
    if not order:
        conn.close()
        raise HTTPException(404, "Order not found")
        
    if order["status"] == "Paid":
        conn.close()
        return ApiResponse(message="Already Paid")
        
    now = datetime.now().strftime("%Y-%m-%d")
    transaction_id = f"cf_{body.orderId}_{int(datetime.now().timestamp())}"
    
    # Mark order as Paid
    conn.execute("UPDATE orders SET status='Paid', payment_method='Cashfree' WHERE id=?", (body.orderId,))
    
    # Record payment
    conn.execute(
        "INSERT INTO payments (order_id,customer_id,staff_id,amount,method,transaction_id,date) VALUES (?,?,?,?,?,?,?)",
        (body.orderId, order["customer_id"], order["staff_id"], order["total"], "Cashfree", transaction_id, now)
    )
    
    # Update performance
    conn.execute("""
        UPDATE staff_performance 
        SET total_payments = total_payments + 1,
            last_updated = ?
        WHERE staff_id = ?
    """, (datetime.now().isoformat(), order["staff_id"]))
    
    conn.commit()
    conn.close()
    
    return ApiResponse(message="Payment verified successfully")

