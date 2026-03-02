from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .models import User

# This function is like a Google Search for your database
async def get_user_by_handle(db: AsyncSession, handle: str):
    # 1. We create the query: "Find a User where the handle matches"
    query = select(User).where(User.handle == handle)
    
    # 2. We execute the query and wait for Neon to respond
    result = await db.execute(query)
    
    # 3. We return the first matching user object
    return result.scalars().first()