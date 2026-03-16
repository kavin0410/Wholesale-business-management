"""Product routes — CRUD with SQLAlchemy ORM."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Product, Supplier
from schemas import ProductCreate, ProductOut, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/products", tags=["Products"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(Product).count()
    products = (
        db.query(Product)
        .order_by(Product.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    data = []
    for p in products:
        data.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "price": p.price,
            "cost_price": p.cost_price,
            "stock": p.stock,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else None,
        })
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{product_id}", response_model=ApiResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return ApiResponse(data={
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "price": p.price,
        "cost_price": p.cost_price,
        "stock": p.stock,
        "supplier_id": p.supplier_id,
        "supplier_name": p.supplier.name if p.supplier else None,
    })


@router.post("", response_model=ApiResponse, status_code=201)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=body.name,
        category=body.category,
        price=body.price,
        cost_price=body.cost_price,
        stock=body.stock,
        supplier_id=body.supplier_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    logger.info("Product created: id=%d name=%s", product.id, product.name)
    return ApiResponse(data={"id": product.id}, message="Product created")


@router.put("/{product_id}", response_model=ApiResponse)
def update_product(product_id: int, body: ProductCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.name = body.name
    product.category = body.category
    product.price = body.price
    product.cost_price = body.cost_price
    product.stock = body.stock
    product.supplier_id = body.supplier_id
    db.commit()
    return ApiResponse(data={"id": product_id}, message="Product updated")


@router.delete("/{product_id}", response_model=ApiResponse)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return ApiResponse(message="Product deleted")
