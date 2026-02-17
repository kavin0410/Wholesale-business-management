"""Delivery tracking routes — status workflow, timeline, role control."""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from database import get_db
from models import DeliveryStatusUpdate, ApiResponse

router = APIRouter(prefix="/delivery", tags=["Delivery"])
logger = logging.getLogger("supplynest")

STATUS_FLOW = ["Packing Order", "Order Packed", "Delivery Travelling", "Delivered"]


@router.get("/all", response_model=ApiResponse)
def list_deliveries():
    conn = get_db()
    rows = conn.execute("""
        SELECT d.*, o.total, o.date AS order_date,
               c.name AS customer_name, p.name AS product_name, o.quantity
        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        JOIN products p ON o.product_id = p.id
        ORDER BY d.id DESC
    """).fetchall()
    conn.close()
    return ApiResponse(data=[dict(r) for r in rows])


@router.get("/{order_id}", response_model=ApiResponse)
def get_delivery(order_id: int):
    conn = get_db()
    d = conn.execute("SELECT * FROM deliveries WHERE order_id=?", (order_id,)).fetchone()
    if not d:
        conn.close()
        raise HTTPException(404, "Delivery not found for this order")
    conn.close()
    return ApiResponse(data=dict(d))


@router.get("/track/{order_id}", response_model=ApiResponse)
def track_delivery(order_id: int):
    """Full tracking view — order, customer, supplier, delivery + timeline."""
    conn = get_db()

    order = conn.execute("""
        SELECT o.*, p.name AS product_name, p.category, p.price AS unit_price,
               p.supplier_id
        FROM orders o JOIN products p ON o.product_id = p.id
        WHERE o.id=?
    """, (order_id,)).fetchone()
    if not order:
        conn.close()
        raise HTTPException(404, "Order not found")

    customer = conn.execute("SELECT * FROM customers WHERE id=?", (order["customer_id"],)).fetchone()

    supplier = None
    if order["supplier_id"]:
        supplier = conn.execute("SELECT * FROM suppliers WHERE id=?", (order["supplier_id"],)).fetchone()

    delivery = conn.execute("SELECT * FROM deliveries WHERE order_id=?", (order_id,)).fetchone()
    if not delivery:
        conn.close()
        raise HTTPException(404, "Delivery record not found")

    timeline = conn.execute(
        "SELECT status, timestamp, note FROM delivery_timeline WHERE delivery_id=? ORDER BY id",
        (delivery["id"],)
    ).fetchall()

    conn.close()

    return ApiResponse(data={
        "order_details": {
            "id": order["id"], "date": order["date"],
            "product_name": order["product_name"], "category": order["category"],
            "quantity": order["quantity"], "unit_price": order["unit_price"],
            "total": order["total"], "status": order["status"],
        },
        "customer_details": dict(customer) if customer else {},
        "supplier_details": dict(supplier) if supplier else {},
        "delivery_details": {
            "id": delivery["id"],
            "status": delivery["status"],
            "assigned_staff": delivery["assigned_staff"],
            "expected_date": delivery["expected_date"],
            "created_at": delivery["created_at"],
            "updated_at": delivery["updated_at"],
            "timeline": [dict(t) for t in timeline],
        },
    })


@router.put("/update-status/{delivery_id}", response_model=ApiResponse)
def update_delivery_status(delivery_id: int, body: DeliveryStatusUpdate):
    """Update delivery status — enforces forward-only flow + role check."""
    if body.status not in STATUS_FLOW:
        raise HTTPException(400, f"Invalid status. Must be one of: {STATUS_FLOW}")

    conn = get_db()
    delivery = conn.execute("SELECT * FROM deliveries WHERE id=?", (delivery_id,)).fetchone()
    if not delivery:
        conn.close()
        raise HTTPException(404, "Delivery not found")

    current_idx = STATUS_FLOW.index(delivery["status"]) if delivery["status"] in STATUS_FLOW else -1
    target_idx = STATUS_FLOW.index(body.status)

    # Forward-only
    if target_idx <= current_idx:
        conn.close()
        raise HTTPException(400, f"Cannot move from '{delivery['status']}' to '{body.status}'. Only forward transitions allowed.")

    # Role check
    if body.role == "staff" and target_idx != current_idx + 1:
        conn.close()
        raise HTTPException(403, "Staff can only move to the next stage")

    if body.role not in ("admin", "staff"):
        conn.close()
        raise HTTPException(403, "Invalid role")

    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE deliveries SET status=?, updated_at=? WHERE id=?",
        (body.status, now, delivery_id)
    )
    conn.execute(
        "INSERT INTO delivery_timeline (delivery_id,status,timestamp,note) VALUES (?,?,?,?)",
        (delivery_id, body.status, now, f"Status changed to {body.status}")
    )

    # If delivered, update order status too
    if body.status == "Delivered":
        conn.execute("UPDATE orders SET status='Delivered' WHERE id=?", (delivery["order_id"],))

    conn.commit()
    conn.close()
    logger.info("Delivery #%d status → %s (by %s)", delivery_id, body.status, body.role)
    return ApiResponse(
        data={"id": delivery_id, "status": body.status},
        message=f"Delivery updated to '{body.status}'"
    )
