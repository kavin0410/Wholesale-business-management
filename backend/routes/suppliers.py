"""Supplier routes with pagination + RBAC."""
from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import SupplierCreate, ApiResponse, PaginatedResponse
from auth_middleware import require_permission

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=PaginatedResponse)
def list_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(require_permission("suppliers:view")),
):
    conn = get_db()
    offset = (page - 1) * limit
    total = conn.execute("SELECT COUNT(*) FROM suppliers").fetchone()[0]
    rows = conn.execute("SELECT * FROM suppliers ORDER BY id DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
    conn.close()
    return PaginatedResponse(data=[dict(r) for r in rows], total=total, page=page, limit=limit)


@router.get("/{supplier_id}", response_model=ApiResponse)
def get_supplier(
    supplier_id: int,
    user: dict = Depends(require_permission("suppliers:view")),
):
    conn = get_db()
    row = conn.execute("SELECT * FROM suppliers WHERE id=?", (supplier_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Supplier not found")
    return ApiResponse(data=dict(row))


@router.post("", response_model=ApiResponse, status_code=201)
def create_supplier(
    body: SupplierCreate,
    user: dict = Depends(require_permission("suppliers:create")),
):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO suppliers (name,phone,email,address) VALUES (?,?,?,?)",
        (body.name, body.phone, body.email, body.address)
    )
    conn.commit()
    sid = cur.lastrowid
    conn.close()
    return ApiResponse(data={"id": sid}, message="Supplier created")


@router.put("/{supplier_id}", response_model=ApiResponse)
def update_supplier(
    supplier_id: int,
    body: SupplierCreate,
    user: dict = Depends(require_permission("suppliers:edit")),
):
    conn = get_db()
    exists = conn.execute("SELECT id FROM suppliers WHERE id=?", (supplier_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Supplier not found")
    conn.execute(
        "UPDATE suppliers SET name=?,phone=?,email=?,address=? WHERE id=?",
        (body.name, body.phone, body.email, body.address, supplier_id)
    )
    conn.commit()
    conn.close()
    return ApiResponse(data={"id": supplier_id}, message="Supplier updated")


@router.delete("/{supplier_id}", response_model=ApiResponse)
def delete_supplier(
    supplier_id: int,
    user: dict = Depends(require_permission("suppliers:delete")),
):
    conn = get_db()
    exists = conn.execute("SELECT id FROM suppliers WHERE id=?", (supplier_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Supplier not found")
    conn.execute("DELETE FROM suppliers WHERE id=?", (supplier_id,))
    conn.commit()
    conn.close()
    return ApiResponse(message="Supplier deleted")
