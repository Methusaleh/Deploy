# backend/app/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production to reduce terminal noise
    connect_args={
        "ssl": True,
        # This specifically prevents the 'channel_binding' error with Neon's pooler
        "server_settings": {"search_path": "public"}
    }
)

# This factory will create a new AsyncSession for every request to our API.
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# This is the FastAPI 'Dependency' we will use in our routes.
# It ensures each request gets its own database connection and closes it when done.
async def get_db():
    async with SessionLocal() as session:
        yield session