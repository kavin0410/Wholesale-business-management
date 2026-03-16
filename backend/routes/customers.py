"""Customer routes — CRUD with SQLAlchemy ORM."""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Customer
from schemas import CustomerCreate, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=PaginatedResponse)
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(Customer).count()
    customers = (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    data = [
        {"id": c.id, "name": c.name, "phone": c.phone, "address": c.address}
        for c in customers
    ]
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{customer_id}", response_model=ApiResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return ApiResponse(data={"id": c.id, "name": c.name, "phone": c.phone, "address": c.address})


@router.post("", response_model=ApiResponse, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(name=body.name, phone=body.phone, address=body.address)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return ApiResponse(data={"id": customer.id}, message="Customer created")


@router.put("/{customer_id}", response_model=ApiResponse)
def update_customer(customer_id: int, body: CustomerCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    customer.name = body.name
    customer.phone = body.phone
    customer.address = body.address
    db.commit()
    return ApiResponse(data={"id": customer_id}, message="Customer updated")


@router.delete("/{customer_id}", response_model=ApiResponse)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    db.delete(customer)
    db.commit()
    return ApiResponse(message="Customer deleted")
