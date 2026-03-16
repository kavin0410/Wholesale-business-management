"""Supplier routes — CRUD with SQLAlchemy ORM."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Supplier
from schemas import SupplierCreate, SupplierOut, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=PaginatedResponse)
def list_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
):
    total = db.query(Supplier).count()
    suppliers = (
        db.query(Supplier)
        .order_by(Supplier.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    data = [
        {"id": s.id, "name": s.name, "phone": s.phone, "address": s.address}
        for s in suppliers
    ]
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{supplier_id}", response_model=ApiResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    return ApiResponse(data={"id": s.id, "name": s.name, "phone": s.phone, "address": s.address})


@router.post("", response_model=ApiResponse, status_code=201)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(name=body.name, phone=body.phone, address=body.address)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return ApiResponse(data={"id": supplier.id}, message="Supplier created")


@router.put("/{supplier_id}", response_model=ApiResponse)
def update_supplier(supplier_id: int, body: SupplierCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    supplier.name = body.name
    supplier.phone = body.phone
    supplier.address = body.address
    db.commit()
    return ApiResponse(data={"id": supplier_id}, message="Supplier updated")


@router.delete("/{supplier_id}", response_model=ApiResponse)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")
    db.delete(supplier)
    db.commit()
    return ApiResponse(message="Supplier deleted")
