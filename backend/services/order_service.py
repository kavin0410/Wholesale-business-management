
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException

from services.base_service import BaseService
from models import Order, OrderItem, Product, Customer, Payment
from schemas import OrderCreate

class OrderService(BaseService[Order, OrderCreate, OrderCreate]):
    def __init__(self):
        super().__init__(Order)

    def create_order(self, db: Session, body: OrderCreate) -> Order:
        # Validate customer
        customer = db.query(Customer).get(body.customer_id)
        if not customer:
            raise HTTPException(404, "Customer not found")

        if not body.items:
            raise HTTPException(400, "Order must have at least one item")

        total_amount = 0.0
        order_items_data = []

        # Validate products and stock
        for item in body.items:
            product = db.query(Product).get(item.product_id)
            if not product:
                raise HTTPException(404, f"Product with id {item.product_id} not found")
            
            if product.stock < item.quantity:
                raise HTTPException(
                    400,
                    f"Insufficient stock for '{product.name}' (available: {product.stock}, requested: {item.quantity})"
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
        db.flush()

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

        # Create default pending payment
        payment = Payment(
            order_id=order.id,
            amount=0,
            payment_status="Pending",
            payment_date=date.today(),
        )
        db.add(payment)

        db.commit()
        db.refresh(order)
        return order

order_service = OrderService()
