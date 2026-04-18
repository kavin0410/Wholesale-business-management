import sys, os
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/api/status")
async def status():
    return {"status": "debug-mode", "sys_path": sys.path}

@app.get("/api/env")
async def env():
    return {"cwd": os.getcwd(), "ls": os.listdir(".")}

try:
    root = os.path.join(os.path.dirname(__file__), "..")
    sys.path.append(root)
    sys.path.append(os.path.join(root, "backend"))

    # Try importing just one thing first
    import main
    app = main.app
except Exception as e:
    import traceback
    error_msg = str(e)
    trace = traceback.format_exc()
    
    @app.get("/api/config")
    @app.get("/api/auth/login")
    @app.post("/api/auth/login")
    async def catch_all_err(request=None):
        return JSONResponse(status_code=500, content={"error": error_msg, "trace": trace})
