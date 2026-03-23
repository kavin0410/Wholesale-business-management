"""
SupplyNest — FastAPI Backend
Main application entry point.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import auth, products, customers, suppliers, orders, payments, delivery, dashboard, ai, staff, reports

# ── Logging ──────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-12s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("supplynest")

# ── App ──────────────────────────────────────────────
app = FastAPI(
    title="SupplyNest API",
    description="Wholesale Business Management System — Backend",
    version="1.0.0",
)

# ── CORS — allow React frontend ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers under /api ──────────────────────
for r in (auth, products, customers, suppliers, orders, payments, delivery, dashboard, ai, staff, reports):
    app.include_router(r.router, prefix="/api")

# ── Startup ──────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    logger.info("SupplyNest API ready")

@app.get("/")
def root():
    return {"message": "SupplyNest API is running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    # reload=False prevents a restart loop caused by sqlite DB file changes being detected by the watcher
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
