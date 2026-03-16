"""Payment routes — list and view payments with SQLAlchemy ORM."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Payment, Order
from schemas import ApiResponse, PaginatedResponse, PaymentOut, PaymentUpdate
from services.payment_service import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=PaginatedResponse)
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    total = db.query(Payment).count()
    payments = payment_service.get_multi(db, skip=skip, limit=limit)
    
    data = []
    for p in payments:
        p_out = PaymentOut.model_validate(p)
        if p.order and p.order.customer:
            p_out.customer_name = p.order.customer.name
        data.append(p_out)
        
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.put("/{payment_id}", response_model=ApiResponse)
def update_payment(payment_id: int, body: PaymentUpdate, db: Session = Depends(get_db)):
    payment = payment_service.get(db, id=payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    
    payment_service.update(db, db_obj=payment, obj_in=body)
    return ApiResponse(message="Payment updated successfully", data=payment.id)


@router.get("/summary", response_model=ApiResponse)
def payment_summary(db: Session = Depends(get_db)):
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar()
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar()
    return ApiResponse(data={
        "total_revenue": float(total_revenue),
        "total_paid": float(total_paid),
        "pending": float(total_revenue - total_paid),
    })
