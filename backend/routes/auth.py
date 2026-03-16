"""Authentication routes — using SQLAlchemy ORM."""
import hashlib
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import LoginRequest, ApiResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("supplynest")


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


@router.post("/login", response_model=ApiResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username.lower()).first()
    if not user or user.password != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    logger.info("User '%s' logged in", req.username)
    return ApiResponse(
        data={"id": user.id, "username": user.username, "role": user.role},
        message=f"Welcome, {user.username}!",
    )
