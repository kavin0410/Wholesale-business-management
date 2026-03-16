"""AI recommendation routes — with in-memory TTL cache, using SQLAlchemy ORM."""
import logging
import time
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Customer, Order, OrderItem, Product
from schemas import ApiResponse

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger("supplynest")

# Simple TTL cache: {customer_id: (timestamp, result)}
_cache: dict[int, tuple[float, dict]] = {}
CACHE_TTL = 60  # seconds


def _get_cached(customer_id: int):
    entry = _cache.get(customer_id)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _set_cache(customer_id: int, result: dict):
    _cache[customer_id] = (time.time(), result)


@router.get("/recommendations/{customer_id}", response_model=ApiResponse)
def get_recommendations(customer_id: int, db: Session = Depends(get_db)):
    cached = _get_cached(customer_id)
    if cached:
        logger.info("AI cache hit for customer %d", customer_id)
        return ApiResponse(data=cached, message="From cache")

    # Verify customer
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")

    # Get customer's order history via OrderItems
    cust_order_items = (
        db.query(OrderItem, Product)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(Order.customer_id == customer_id)
        .all()
    )

    if not cust_order_items:
        result = {
            "recommended_products": [],
            "confidence_score": 0,
            "reason": "No purchase history for this customer",
        }
        _set_cache(customer_id, result)
        return ApiResponse(data=result)

    # Frequently bought together analysis
    bought_ids = set()
    category_counts = defaultdict(int)
    for oi, prod in cust_order_items:
        bought_ids.add(prod.id)
        category_counts[prod.category] += oi.quantity

    top_categories = sorted(category_counts.items(), key=lambda x: -x[1])[:3]
    top_cat_names = [c[0] for c in top_categories]

    # Find products in same categories NOT yet bought by this customer
    candidates = (
        db.query(Product)
        .filter(
            Product.category.in_(top_cat_names),
            Product.id.notin_(bought_ids),
            Product.stock > 0,
        )
        .order_by(Product.stock.desc())
        .limit(10)
        .all()
    )

    # Sales frequency ranking — popular products not bought by this customer
    freq_ranking = (
        db.query(Product, func.sum(OrderItem.quantity).label("total_sold"))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .filter(
            Product.id.notin_(bought_ids),
            Product.stock > 0,
        )
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    # Merge results
    seen = set()
    recommended = []
    for p in candidates:
        if p.id not in seen:
            seen.add(p.id)
            recommended.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "price": p.price,
                "stock": p.stock,
            })

    for p, _ in freq_ranking:
        if p.id not in seen:
            seen.add(p.id)
            recommended.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "price": p.price,
                "stock": p.stock,
            })

    recommended = recommended[:8]

    total_orders = len(cust_order_items)
    confidence = min(0.95, 0.3 + total_orders * 0.05)

    result = {
        "recommended_products": recommended,
        "confidence_score": round(confidence, 2),
        "reason": f"Based on {total_orders} past purchases in categories: {', '.join(top_cat_names)}",
    }

    _set_cache(customer_id, result)
    logger.info(
        "AI recommendations generated for customer %d (%d results)",
        customer_id,
        len(recommended),
    )
    return ApiResponse(data=result)
