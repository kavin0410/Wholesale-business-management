"""
SupplyNest — FastAPI Backend
Main application entry point.
"""
import logging, os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────
for r in (auth, products, customers, suppliers, orders, payments, delivery, dashboard, ai, staff, reports):
    app.include_router(r.router, prefix="/api")

# ── Config Route ─────────────────────────────────────
@app.get("/api/config")
def get_config():
    return {
        "success": True
    }


# ── Startup ──────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    logger.info("SupplyNest API ready")

# ── Static Files (Frontend) ───────────────────────────
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs"):
            return None 
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Frontend not found"}
else:
    @app.get("/")
    def root():
        return {"message": "SupplyNest API Running (No frontend build)", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
