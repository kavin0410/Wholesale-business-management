"""Authentication routes — using SQLAlchemy ORM."""
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db, pwd_context
from models import User
from schemas import LoginRequest, ApiResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("supplynest")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


@router.post("/login", response_model=ApiResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username.lower()).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    logger.info("User '%s' logged in", req.username)
    return ApiResponse(
        data={"id": user.id, "username": user.username, "role": user.role},
        message=f"Welcome, {user.username}!",
    )
