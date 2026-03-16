"""Payment routes — list and view payments with SQLAlchemy ORM."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Payment, Order
from schemas import ApiResponse, PaginatedResponse
import schemas

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=PaginatedResponse)
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(Payment).count()
    payments = (
        db.query(Payment)
        .order_by(Payment.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    data = []
    for p in payments:
        customer_name = None
        if p.order and p.order.customer:
            customer_name = p.order.customer.name
        data.append({
            "id": p.id,
            "order_id": p.order_id,
            "amount": p.amount,
            "payment_status": p.payment_status,
            "payment_date": str(p.payment_date),
            "customer_name": customer_name,
        })
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.put("/{payment_id}", response_model=ApiResponse)
def update_payment(payment_id: int, body: schemas.PaymentUpdate, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        return ApiResponse(success=False, message="Payment not found")
    
    payment.amount = body.amount
    payment.payment_status = body.payment_status
    payment.payment_date = body.payment_date
    db.commit()
    db.refresh(payment)
    return ApiResponse(success=True, message="Payment updated successfully", data=payment.id)


@router.get("/summary", response_model=ApiResponse)
def payment_summary(db: Session = Depends(get_db)):
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).scalar()
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar()
    return ApiResponse(data={
        "total_revenue": float(total_revenue),
        "total_paid": float(total_paid),
        "pending": float(total_revenue - total_paid),
    })
