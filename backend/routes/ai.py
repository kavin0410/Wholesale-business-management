"""AI recommendation routes — with in-memory TTL cache + RBAC."""
import logging, time
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import ApiResponse
from auth_middleware import require_permission

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
def get_recommendations(
    customer_id: int,
    user: dict = Depends(require_permission("ai:view")),
):
    cached = _get_cached(customer_id)
    if cached:
        logger.info("AI cache hit for customer %d", customer_id)
        return ApiResponse(data=cached, message="From cache")

    conn = get_db()

    # Verify customer
    cust = conn.execute("SELECT id, name FROM customers WHERE id=?", (customer_id,)).fetchone()
    if not cust:
        conn.close()
        raise HTTPException(404, "Customer not found")

    # Get customer's order history
    cust_orders = conn.execute("""
        SELECT o.product_id, o.quantity, p.name, p.category, p.price
        FROM orders o JOIN products p ON o.product_id = p.id
        WHERE o.customer_id = ?
    """, (customer_id,)).fetchall()

    if not cust_orders:
        conn.close()
        result = {
            "recommended_products": [],
            "confidence_score": 0,
            "reason": "No purchase history for this customer"
        }
        _set_cache(customer_id, result)
        return ApiResponse(data=result)

    # --- Frequently bought together ---
    bought_ids = set()
    category_counts = defaultdict(int)
    for o in cust_orders:
        bought_ids.add(o["product_id"])
        category_counts[o["category"]] += o["quantity"]

    top_categories = sorted(category_counts.items(), key=lambda x: -x[1])[:3]
    top_cat_names = [c[0] for c in top_categories]

    # Find products in same categories NOT yet bought by this customer
    placeholders = ",".join("?" * len(top_cat_names))
    bought_placeholders = ",".join("?" * len(bought_ids))
    candidates = conn.execute(f"""
        SELECT p.id, p.name, p.category, p.price, p.stock
        FROM products p
        WHERE p.category IN ({placeholders})
          AND p.id NOT IN ({bought_placeholders})
          AND p.stock > 0
        ORDER BY p.stock DESC
        LIMIT 10
    """, (*top_cat_names, *bought_ids)).fetchall()

    # --- Sales frequency ranking ---
    freq_ranking = conn.execute("""
        SELECT p.id, p.name, p.category, p.price, p.stock,
               SUM(o.quantity) AS total_sold
        FROM orders o JOIN products p ON o.product_id = p.id
        WHERE p.id NOT IN (SELECT DISTINCT product_id FROM orders WHERE customer_id=?)
          AND p.stock > 0
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
    """, (customer_id,)).fetchall()

    conn.close()

    # Merge results
    seen = set()
    recommended = []
    for r in list(candidates) + list(freq_ranking):
        if r["id"] not in seen:
            seen.add(r["id"])
            recommended.append({
                "id": r["id"], "name": r["name"], "category": r["category"],
                "price": r["price"], "stock": r["stock"],
            })
    recommended = recommended[:8]

    total_orders = len(cust_orders)
    confidence = min(0.95, 0.3 + total_orders * 0.05)

    result = {
        "recommended_products": recommended,
        "confidence_score": round(confidence, 2),
        "reason": f"Based on {total_orders} past purchases in categories: {', '.join(top_cat_names)}"
    }

    _set_cache(customer_id, result)
    logger.info("AI recommendations generated for customer %d (%d results)", customer_id, len(recommended))
    return ApiResponse(data=result)
