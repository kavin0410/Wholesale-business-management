"""
Order routes — auto stock reduction, auto subtotal/total calculation,
insufficient stock prevention. No delivery logic.
"""
import logging
from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Order, OrderItem, Product, Customer, Payment
from schemas import OrderCreate, ApiResponse, PaginatedResponse

router = APIRouter(prefix="/orders", tags=["Orders"])
logger = logging.getLogger("supplynest")


@router.get("", response_model=PaginatedResponse)
def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.query(Order).count()
    orders = (
        db.query(Order)
        .order_by(Order.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    data = []
    for o in orders:
        items = []
        for item in o.order_items:
            items.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else None,
                "quantity": item.quantity,
                "subtotal": item.subtotal,
            })
        data.append({
            "id": o.id,
            "customer_id": o.customer_id,
            "customer_name": o.customer.name if o.customer else None,
            "order_date": str(o.order_date),
            "total_amount": o.total_amount,
            "items": items,
            "payment_status": o.payment.payment_status if o.payment else None,
        })
    return PaginatedResponse(data=data, total=total, page=page, limit=limit)


@router.get("/{order_id}", response_model=ApiResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    items = []
    for item in o.order_items:
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else None,
            "quantity": item.quantity,
            "subtotal": item.subtotal,
        })
    return ApiResponse(data={
        "id": o.id,
        "customer_id": o.customer_id,
        "customer_name": o.customer.name if o.customer else None,
        "order_date": str(o.order_date),
        "total_amount": o.total_amount,
        "items": items,
        "payment_status": o.payment.payment_status if o.payment else None,
    })


@router.post("", response_model=ApiResponse, status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    # Validate customer exists
    customer = db.query(Customer).filter(Customer.id == body.customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    if not body.items:
        raise HTTPException(400, "Order must have at least one item")

    # Validate products and stock
    total_amount = 0.0
    order_items_data = []

    for item in body.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(404, f"Product with id {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                400,
                f"Insufficient stock for '{product.name}' "
                f"(available: {product.stock}, requested: {item.quantity})"
            )
        subtotal = product.price * item.quantity
        total_amount += subtotal
        order_items_data.append({
            "product": product,
            "quantity": item.quantity,
            "subtotal": subtotal,
        })

    # Create order
    order = Order(
        customer_id=body.customer_id,
        order_date=date.today(),
        total_amount=total_amount,
    )
    db.add(order)
    db.flush()  # Get order.id

    # Create order items and reduce stock
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            subtotal=item_data["subtotal"],
        )
        db.add(order_item)
        # Reduce stock
        item_data["product"].stock -= item_data["quantity"]

    # Auto-create payment record (Pending)
    payment = Payment(
        order_id=order.id,
        amount=0,
        payment_status="Pending",
        payment_date=date.today(),
    )
    db.add(payment)

    db.commit()
    db.refresh(order)

    logger.info("Order created: id=%d total=%.2f", order.id, total_amount)
    return ApiResponse(
        data={"id": order.id, "total_amount": total_amount},
        message="Order placed successfully"
    )


@router.delete("/{order_id}", response_model=ApiResponse)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    db.delete(order)  # cascade deletes order_items and payment
    db.commit()
    return ApiResponse(message="Order deleted")
