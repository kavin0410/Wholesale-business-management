"""
Role-Based Access Control (RBAC) — Authorization middleware.

Provides dependency-injection functions for FastAPI routes
that verify the logged-in user's role before granting access.
"""

import hashlib, logging
from typing import Optional
from fastapi import Header, HTTPException, Depends

from database import get_db

logger = logging.getLogger("supplynest")


# ── Permission Definitions ───────────────────────────────────
# Maps each role to the set of permissions it holds.
ROLE_PERMISSIONS = {
    "admin": {
        # Products
        "products:view", "products:create", "products:edit", "products:delete",
        # Suppliers
        "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
        # Customers
        "customers:view", "customers:create", "customers:edit", "customers:delete",
        # Orders
        "orders:view", "orders:create", "orders:edit", "orders:delete",
        # Payments
        "payments:view", "payments:create",
        # Reports & Dashboard
        "reports:view", "dashboard:view",
        # Delivery
        "delivery:view", "delivery:edit",
        # Settings & System
        "settings:view", "settings:edit",
        "users:manage",
        "export:data",
        # AI
        "ai:view",
    },
    "staff": {
        # Products — view only (no create/edit/delete)
        "products:view",
        # Suppliers — view only
        "suppliers:view",
        # Customers — view only (can see details for orders)
        "customers:view",
        # Orders — create and view (core staff function)
        "orders:view", "orders:create",
        # Payments — view only (can see payment info)
        "payments:view",
        # Dashboard — view (limited stats)
        "dashboard:view",
        # Delivery — view and edit status (staff manages delivery status)
        "delivery:view", "delivery:edit",
        # AI recommendations — view
        "ai:view",
    },
}


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _get_user_from_header(x_user_role: Optional[str], x_user_id: Optional[str]):
    """
    Extract and validate user from custom headers.
    In a production system this would be a JWT/session check.
    For this app we trust the headers set by the frontend,
    but we ALSO verify against the database.
    """
    if not x_user_role or not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
        )

    try:
        user_id = int(x_user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user ID")

    # Verify user exists in DB with claimed role
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, role FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Server-side role is the source of truth (not the header)
    actual_role = user["role"]
    if actual_role != x_user_role:
        logger.warning(
            "Role mismatch: user %d claimed '%s' but DB says '%s'",
            user_id, x_user_role, actual_role,
        )

    return {"id": user["id"], "username": user["username"], "role": actual_role}


# ── Dependency: Get Current User ─────────────────────────────
def get_current_user(
    x_user_role: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """FastAPI dependency — returns the authenticated user dict."""
    return _get_user_from_header(x_user_role, x_user_id)


# ── Dependency Factories: Permission Checks ──────────────────
def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that ensures the user's role
    is one of the allowed roles.

    Usage:
        @router.delete("/{id}", dependencies=[Depends(require_role("admin"))])
    """
    def _check(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            logger.warning(
                "Access denied: user '%s' (role=%s) tried action requiring %s",
                user["username"], user["role"], allowed_roles,
            )
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. This action requires role: {', '.join(allowed_roles)}",
            )
        return user
    return _check


def require_permission(permission: str):
    """
    Returns a FastAPI dependency that checks if the user's role
    has a specific permission.

    Usage:
        @router.post("", dependencies=[Depends(require_permission("products:create"))])
    """
    def _check(user: dict = Depends(get_current_user)):
        role = user["role"]
        perms = ROLE_PERMISSIONS.get(role, set())
        if permission not in perms:
            logger.warning(
                "Permission denied: user '%s' (role=%s) lacks '%s'",
                user["username"], role, permission,
            )
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You do not have the '{permission}' permission.",
            )
        return user
    return _check


# ── Helper: Get permissions for a role ───────────────────────
def get_permissions_for_role(role: str) -> list:
    """Return a sorted list of permissions for a given role."""
    return sorted(ROLE_PERMISSIONS.get(role, set()))
