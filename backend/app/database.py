# backend/app/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# The engine is the starting point for SQLAlchemy
engine = create_async_engine(DATABASE_URL, echo=True)

# This creates a "factory" for database sessions
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# This is a 'Dependency' that we will use in our API routes
async def get_db():
    async with SessionLocal() as session:
        yield session