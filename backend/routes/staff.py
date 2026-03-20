from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from database import get_db, _hash
from models import ApiResponse, StaffCreate, StaffUpdate, StaffOut, StaffPerformanceOut, PaginatedResponse
from auth_middleware import require_permission, get_current_user

router = APIRouter(prefix="/admin", tags=["Staff Management"])

@router.get("/staff", response_model=PaginatedResponse)
async def list_staff(
    page: int = 1, 
    limit: int = 20, 
    user: dict = Depends(require_permission("staff:view"))
):
    conn = get_db()
    offset = (page - 1) * limit
    users = conn.execute(
        "SELECT id, username, role, name, email, phone, address, status FROM users WHERE role='staff' LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM users WHERE role='staff'").fetchone()[0]
    conn.close()
    
    return PaginatedResponse(
        data=[dict(u) for u in users],
        total=total,
        page=page,
        limit=limit
    )

@router.post("/staff", response_model=ApiResponse)
async def create_staff(
    staff: StaffCreate, 
    user: dict = Depends(require_permission("staff:create"))
):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username=?", (staff.username,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    
    now = datetime.now().isoformat()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO users (username, password, role, name, email, phone, address, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (staff.username, _hash(staff.password), staff.role, staff.name, staff.email, staff.phone, staff.address, "active", now, now)
    )
    staff_id = cur.lastrowid
    
    # Init performance record
    cur.execute("INSERT INTO staff_performance (staff_id, last_updated) VALUES (?, ?)", (staff_id, now))
    
    conn.commit()
    conn.close()
    return ApiResponse(message="Staff created successfully")

@router.put("/staff/{staff_id}", response_model=ApiResponse)
async def update_staff(
    staff_id: int, 
    staff: StaffUpdate, 
    user: dict = Depends(require_permission("staff:edit"))
):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE id=? AND role='staff'", (staff_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Staff not found")
        
    updates = []
    params = []
    
    if staff.name is not None: updates.append("name=?"); params.append(staff.name)
    if staff.email is not None: updates.append("email=?"); params.append(staff.email)
    if staff.phone is not None: updates.append("phone=?"); params.append(staff.phone)
    if staff.address is not None: updates.append("address=?"); params.append(staff.address)
    if staff.status is not None: updates.append("status=?"); params.append(staff.status)
    if staff.password: updates.append("password=?"); params.append(_hash(staff.password))
    
    if updates:
        params.append(datetime.now().isoformat())
        params.append(staff_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)}, updated_at=? WHERE id=?", params)
        conn.commit()
    
    conn.close()
    return ApiResponse(message="Staff updated successfully")

@router.delete("/staff/{staff_id}", response_model=ApiResponse)
async def delete_staff(
    staff_id: int, 
    user: dict = Depends(require_permission("staff:delete"))
):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id=? AND role='staff'", (staff_id,))
    conn.execute("DELETE FROM staff_performance WHERE staff_id=?", (staff_id,))
    conn.commit()
    conn.close()
    return ApiResponse(message="Staff deleted successfully")

@router.get("/performance", response_model=ApiResponse)
async def all_performance(
    user: dict = Depends(require_permission("performance:view"))
):
    conn = get_db()
    perf = conn.execute("""
        SELECT sp.*, u.username, u.name 
        FROM staff_performance sp
        JOIN users u ON sp.staff_id = u.id
    """).fetchall()
    conn.close()
    return ApiResponse(data=[dict(p) for p in perf])

@router.get("/performance/{staff_id}", response_model=ApiResponse)
async def staff_performance(
    staff_id: int, 
    user: dict = Depends(get_current_user)
):
    # Only admin or the staff member themselves can view their performance
    if user["role"] != "admin" and user["id"] != staff_id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    conn = get_db()
    perf = conn.execute("""
        SELECT sp.*, u.username, u.name 
        FROM staff_performance sp
        JOIN users u ON sp.staff_id = u.id
        WHERE sp.staff_id = ?
    """, (staff_id,)).fetchone()
    conn.close()
    
    if not perf:
        raise HTTPException(status_code=404, detail="Performance record not found")
        
    return ApiResponse(data=dict(perf))
