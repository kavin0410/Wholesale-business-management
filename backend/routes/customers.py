"""Customer routes with pagination."""
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import CustomerCreate, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedResponse)
def list_customers(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100)):
    conn = get_db()
    offset = (page - 1) * limit
    total = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    rows = conn.execute("SELECT * FROM customers ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
    conn.close()
    return PaginatedResponse(data=[dict(r) for r in rows], total=total, page=page, limit=limit)


@router.get("/{customer_id}", response_model=ApiResponse)
def get_customer(customer_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Customer not found")
    return ApiResponse(data=dict(row))


@router.post("", response_model=ApiResponse, status_code=201)
def create_customer(body: CustomerCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO customers (name,phone,email,address) VALUES (?,?,?,?)",
        (body.name, body.phone, body.email, body.address)
    )
    conn.commit()
    cid = cur.lastrowid
    conn.close()
    return ApiResponse(data={"id": cid}, message="Customer created")


@router.put("/{customer_id}", response_model=ApiResponse)
def update_customer(customer_id: int, body: CustomerCreate):
    conn = get_db()
    exists = conn.execute("SELECT id FROM customers WHERE id=?", (customer_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Customer not found")
    conn.execute(
        "UPDATE customers SET name=?,phone=?,email=?,address=? WHERE id=?",
        (body.name, body.phone, body.email, body.address, customer_id)
    )
    conn.commit()
    conn.close()
    return ApiResponse(data={"id": customer_id}, message="Customer updated")


@router.delete("/{customer_id}", response_model=ApiResponse)
def delete_customer(customer_id: int):
    conn = get_db()
    exists = conn.execute("SELECT id FROM customers WHERE id=?", (customer_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Customer not found")
    conn.execute("DELETE FROM customers WHERE id=?", (customer_id,))
    conn.commit()
    conn.close()
    return ApiResponse(message="Customer deleted")
