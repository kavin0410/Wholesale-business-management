import sys
import os
from pathlib import Path

# Add the project root to sys.path so we can import from backend
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root / "backend"))

# The entry point for Vercel must export the app as 'app'
from main import app
