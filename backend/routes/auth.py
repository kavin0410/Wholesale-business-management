"""Authentication routes — login + permissions endpoint."""
import hashlib, logging
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import LoginRequest, ApiResponse
from auth_middleware import get_current_user, get_permissions_for_role, ROLE_PERMISSIONS

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("supplynest")


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


@router.post("/login", response_model=ApiResponse)
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, role, password FROM users WHERE username=?",
        (req.username.strip().lower(),)
    ).fetchone()
    conn.close()
    if not user or user["password"] != _hash(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    logger.info("User '%s' (role=%s) logged in", req.username, user["role"])

    # Return user info + their permissions
    role = user["role"]
    permissions = get_permissions_for_role(role)

    return ApiResponse(
        data={
            "id": user["id"],
            "username": user["username"],
            "role": role,
            "permissions": permissions,
        },
        message=f"Welcome, {user['username']}!"
    )


@router.get("/permissions", response_model=ApiResponse)
def get_my_permissions(user: dict = Depends(get_current_user)):
    """Return the current user's permissions (useful after login or page refresh)."""
    permissions = get_permissions_for_role(user["role"])
    return ApiResponse(
        data={
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "permissions": permissions,
        }
    )


@router.get("/roles", response_model=ApiResponse)
def list_roles():
    """Return all available roles and their permissions (admin only)."""
    roles_data = {}
    for role, perms in ROLE_PERMISSIONS.items():
        roles_data[role] = sorted(perms)
    return ApiResponse(data=roles_data)
