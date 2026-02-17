"""Authentication routes."""
import hashlib, logging
from fastapi import APIRouter, HTTPException
from database import get_db
from models import LoginRequest, ApiResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("supplynest")


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


@router.post("/login", response_model=ApiResponse)
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, role, password FROM users WHERE username=?",
        (req.username.lower(),)
    ).fetchone()
    conn.close()
    if not user or user["password"] != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    logger.info("User '%s' logged in", req.username)
    return ApiResponse(
        data={"id": user["id"], "username": user["username"], "role": user["role"]},
        message=f"Welcome, {user['username']}!"
    )
