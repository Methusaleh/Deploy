# backend/app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db

app = FastAPI(
    title="Deploy",
    description="Kanban Board for Software Development",
    version="1.0.0"
)

@app.get("/")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        # We perform a tiny query to see if the DB is alive
        await db.execute(text("SELECT 1"))
        return {"status": "online", "message": "Welcome to Deploy API", "database": "connected"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}