from fastapi import FastAPI, Depends, HTTPException  # Added HTTPException
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession      # Added AsyncSession
from .database import engine, get_db
from .models import Base
from . import crud



# 1. Define the Lifespan logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    # This creates the tables in Neon if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield  # The app stays "alive" here
    
    # --- Shutdown Logic (Optional) ---
    # Any cleanup goes here (closing connections, etc.)

# 2. Pass the lifespan to the FastAPI instance
app = FastAPI(
    title="Deploy",
    description="Kanban Board for Software Development",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Deploy API is running"}

@app.get("/test-user/{handle}")
async def test_user_connection(handle: str, db: AsyncSession = Depends(get_db)):
    # Use the CRUD function to find the user
    user = await crud.get_user_by_handle(db, handle)
    
    # If the librarian finds nothing, tell the user
    if not user:
        raise HTTPException(status_code=404, detail="User not found in Neon")
    
    # If found, return the info (but NOT the password hash!)
    return {
        "message": "Connection Successful!",
        "user": {
            "name": f"{user.first_name} {user.last_name}",
            "handle": user.handle,
            "email": user.email
        }
    }