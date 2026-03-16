---
description: How to start the SupplyNest application (both backend and frontend)
---

## Start SupplyNest

Both the backend and frontend need to be running for data to load.

### 1. Start the FastAPI backend
// turbo
```
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Run from: `backend/` directory

### 2. Start the Vite frontend
// turbo
```
npm run dev
```
Run from: project root directory

### Notes
- Backend runs on port 8000, frontend on port 5173
- Vite proxy forwards `/api/*` requests to the backend automatically
- Login: admin/admin123 or staff/staff123
