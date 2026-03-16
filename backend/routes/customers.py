"""Customer routes — CRUD with SQLAlchemy ORM."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Customer
from schemas import CustomerCreate, CustomerOut, ApiResponse, PaginatedResponse
from services.customer_service import customer_service

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedResponse)
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    total = db.query(Customer).count()
    customers = customer_service.get_multi(db, skip=skip, limit=limit)
    data = [CustomerOut.model_validate(c) for c in customers]
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{customer_id}", response_model=ApiResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = customer_service.get(db, id=customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")
    return ApiResponse(data=CustomerOut.model_validate(c))


@router.post("", response_model=ApiResponse, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    customer = customer_service.create(db, obj_in=body)
    return ApiResponse(data={"id": customer.id}, message="Customer created")


@router.put("/{customer_id}", response_model=ApiResponse)
def update_customer(customer_id: int, body: CustomerCreate, db: Session = Depends(get_db)):
    customer = customer_service.get(db, id=customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    customer_service.update(db, db_obj=customer, obj_in=body)
    return ApiResponse(data={"id": customer_id}, message="Customer updated")


@router.delete("/{customer_id}", response_model=ApiResponse)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = customer_service.get(db, id=customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    customer_service.delete(db, id=customer_id)
    return ApiResponse(message="Customer deleted")
