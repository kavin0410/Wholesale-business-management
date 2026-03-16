"""Product routes — CRUD with SQLAlchemy ORM."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Product
from schemas import ProductCreate, ProductOut, ApiResponse, PaginatedResponse
from services.product_service import product_service

router = APIRouter(prefix="/products", tags=["Products"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    total = db.query(Product).count()
    products = product_service.get_multi(db, skip=skip, limit=limit)
    
    # Enrich with supplier_name for frontend compatibility
    data = []
    for p in products:
        p_out = ProductOut.model_validate(p)
        if p.supplier:
            p_out.supplier_name = p.supplier.name
        data.append(p_out)
        
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{product_id}", response_model=ApiResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = product_service.get(db, id=product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    
    p_out = ProductOut.model_validate(p)
    if p.supplier:
        p_out.supplier_name = p.supplier.name
        
    return ApiResponse(data=p_out)


@router.post("", response_model=ApiResponse, status_code=201)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    product = product_service.create(db, obj_in=body)
    logger.info("Product created: id=%d name=%s", product.id, product.name)
    return ApiResponse(data={"id": product.id}, message="Product created")


@router.put("/{product_id}", response_model=ApiResponse)
def update_product(product_id: int, body: ProductCreate, db: Session = Depends(get_db)):
    product = product_service.get(db, id=product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    product_service.update(db, db_obj=product, obj_in=body)
    return ApiResponse(data={"id": product_id}, message="Product updated")


@router.delete("/{product_id}", response_model=ApiResponse)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.get(db, id=product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    product_service.delete(db, id=product_id)
    return ApiResponse(message="Product deleted")
