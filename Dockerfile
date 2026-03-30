# ── Build Frontend ───────────────────────────────────
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Setup Backend (Production) ──────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from stage 1
COPY --from=builder /app/dist /dist

# Copy backend source
COPY backend /app/backend

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Set a separate volume for the database to ensure persistence
# In a real cloud setup, you would map this to a persistent disk
RUN mkdir -p /data
# Tell the app to use the persistent data folder (requires update in database.py)
ENV DB_PATH=/data/supplynest.db

# Run with gunicorn + uvicorn worker for production performance
WORKDIR /app/backend
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "-b", "0.0.0.0:8000"]
