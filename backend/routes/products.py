"""Product routes with pagination."""
import logging
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import ProductCreate, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/products", tags=["Products"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_products(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100)):
    conn = get_db()
    offset = (page - 1) * limit
    total = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    rows = conn.execute("""
        SELECT p.*, s.name AS supplier_name
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    conn.close()
    return PaginatedResponse(data=[dict(r) for r in rows], total=total, page=page, limit=limit)


@router.get("/{product_id}", response_model=ApiResponse)
def get_product(product_id: int):
    conn = get_db()
    row = conn.execute("""
        SELECT p.*, s.name AS supplier_name
        FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id=?
    """, (product_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Product not found")
    return ApiResponse(data=dict(row))


@router.post("", response_model=ApiResponse, status_code=201)
def create_product(body: ProductCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO products (name,category,cost_price,price,stock,supplier_id) VALUES (?,?,?,?,?,?)",
        (body.name, body.category, body.cost_price, body.price, body.stock, body.supplier_id)
    )
    conn.commit()
    pid = cur.lastrowid
    conn.close()
    logger.info("Product created: id=%d name=%s", pid, body.name)
    return ApiResponse(data={"id": pid}, message="Product created")


@router.put("/{product_id}", response_model=ApiResponse)
def update_product(product_id: int, body: ProductCreate):
    conn = get_db()
    exists = conn.execute("SELECT id FROM products WHERE id=?", (product_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Product not found")
    conn.execute(
        "UPDATE products SET name=?,category=?,cost_price=?,price=?,stock=?,supplier_id=? WHERE id=?",
        (body.name, body.category, body.cost_price, body.price, body.stock, body.supplier_id, product_id)
    )
    conn.commit()
    conn.close()
    return ApiResponse(data={"id": product_id}, message="Product updated")


@router.delete("/{product_id}", response_model=ApiResponse)
def delete_product(product_id: int):
    conn = get_db()
    exists = conn.execute("SELECT id FROM products WHERE id=?", (product_id,)).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(404, "Product not found")
    conn.execute("DELETE FROM products WHERE id=?", (product_id,))
    conn.commit()
    conn.close()
    return ApiResponse(message="Product deleted")
