"""Supplier routes — CRUD with SQLAlchemy ORM."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Supplier
from schemas import SupplierCreate, SupplierOut, ApiResponse, PaginatedResponse
from services.supplier_service import supplier_service

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=PaginatedResponse)
def list_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    total = db.query(Supplier).count()
    suppliers = supplier_service.get_multi(db, skip=skip, limit=limit)
    data = [SupplierOut.model_validate(s) for s in suppliers]
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{supplier_id}", response_model=ApiResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = supplier_service.get(db, id=supplier_id)
    if not s:
        raise HTTPException(404, "Supplier not found")
    return ApiResponse(data=SupplierOut.model_validate(s))


@router.post("", response_model=ApiResponse, status_code=201)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = supplier_service.create(db, obj_in=body)
    return ApiResponse(data={"id": supplier.id}, message="Supplier created")


@router.put("/{supplier_id}", response_model=ApiResponse)
def update_supplier(supplier_id: int, body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = supplier_service.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    
    supplier_service.update(db, db_obj=supplier, obj_in=body)
    return ApiResponse(data={"id": supplier_id}, message="Supplier updated")


@router.delete("/{supplier_id}", response_model=ApiResponse)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = supplier_service.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    
    supplier_service.delete(db, id=supplier_id)
    return ApiResponse(message="Supplier deleted")
