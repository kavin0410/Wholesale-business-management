"""Delivery Tracking routes."""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import ApiResponse
from auth_middleware import require_permission, get_current_user
from datetime import datetime
import logging
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.email_service import send_dispatch_email

logger = logging.getLogger("supplynest")
router = APIRouter(prefix="/delivery", tags=["Delivery"])

@router.get("", response_model=ApiResponse)
def get_deliveries(user: dict = Depends(require_permission("delivery:view"))):
    conn = get_db()
    # Join with orders, customers, products for a full view
    deliveries = conn.execute("""
        SELECT d.*, 
               o.date as order_date, o.total as order_total,
               c.name as customer_name, p.name as product_name
        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        JOIN products p ON o.product_id = p.id
        ORDER BY d.updated_at DESC
    """).fetchall()
    conn.close()
    return ApiResponse(data=[dict(d) for d in deliveries])

@router.get("/{order_id}", response_model=ApiResponse)
def get_delivery_by_order(order_id: int, user: dict = Depends(require_permission("delivery:view"))):
    conn = get_db()
    delivery = conn.execute("SELECT * FROM deliveries WHERE order_id = ?", (order_id,)).fetchone()
    if not delivery:
        conn.close()
        raise HTTPException(404, "Delivery not found for this order")
    
    timeline = conn.execute("SELECT * FROM delivery_timeline WHERE delivery_id = ? ORDER BY timestamp ASC", (delivery["id"],)).fetchall()
    
    result = dict(delivery)
    result["timeline"] = [dict(t) for t in timeline]
    
    conn.close()
    return ApiResponse(data=result)

@router.put("/{delivery_id}/status", response_model=ApiResponse)
def update_delivery_status(delivery_id: int, req: dict, user: dict = Depends(require_permission("delivery:edit"))):
    new_status = req.get("status")
    note = req.get("note", f"Status updated to {new_status}")
    
    if not new_status:
        raise HTTPException(400, "Status is required")
        
    conn = get_db()
    delivery = conn.execute("SELECT * FROM deliveries WHERE id = ?", (delivery_id,)).fetchone()
    if not delivery:
        conn.close()
        raise HTTPException(404, "Delivery not found")
        
    old_status = delivery["status"]
    order_id = delivery["order_id"]
    now = datetime.now().isoformat()
    conn.execute("UPDATE deliveries SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, delivery_id))
    conn.execute("INSERT INTO delivery_timeline (delivery_id, status, timestamp, note) VALUES (?,?,?,?)",
                 (delivery_id, new_status, now, note))
    
    # Check if we should send an email notification
    if new_status.lower() == "dispatched" and old_status.lower() != "dispatched":
        customer = conn.execute("""
            SELECT c.name, c.email, o.total, p.name as product_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN products p ON o.product_id = p.id
            WHERE o.id = ?
        """, (order_id,)).fetchone()
        
        if customer and customer["email"]:
            send_dispatch_email(
                customer_name=customer["name"],
                customer_email=customer["email"],
                order_id=order_id,
                product_name=customer["product_name"],
                total=customer["total"]
            )
            
    conn.commit()
    conn.close()
    
    logger.info("Delivery %d updated to %s by %s", delivery_id, new_status, user["username"])
    return ApiResponse(message=f"Delivery updated to {new_status}")
