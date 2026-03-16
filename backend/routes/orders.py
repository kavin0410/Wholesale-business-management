"""
Order routes — auto stock reduction, auto subtotal/total calculation,
insufficient stock prevention. No delivery logic.
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Order
from schemas import OrderCreate, OrderOut, ApiResponse, PaginatedResponse
from services.order_service import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    total = db.query(Order).count()
    orders = order_service.get_multi(db, skip=skip, limit=limit)
    
    data = []
    for o in orders:
        o_out = OrderOut.model_validate(o)
        o_out.customer_name = o.customer.name if o.customer else None
        o_out.payment_status = o.payment.payment_status if o.payment else None
        data.append(o_out)
        
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{order_id}", response_model=ApiResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = order_service.get(db, id=order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    
    o_out = OrderOut.model_validate(o)
    o_out.customer_name = o.customer.name if o.customer else None
    o_out.payment_status = o.payment.payment_status if o.payment else None
    
    return ApiResponse(data=o_out)


@router.post("", response_model=ApiResponse, status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    order = order_service.create_order(db, body=body)
    logger.info("Order created: id=%d total=%.2f", order.id, order.total_amount)
    return ApiResponse(
        data={"id": order.id, "total_amount": order.total_amount},
        message="Order placed successfully"
    )


@router.delete("/{order_id}", response_model=ApiResponse)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = order_service.get(db, id=order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    
    order_service.delete(db, id=order_id)
    return ApiResponse(message="Order deleted")
