from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- 1. USER SCHEMAS ---

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    handle: Optional[str] = None
    bio: Optional[str] = None

class UserCreate(UserBase):
    password: str # This is only used when creating a user

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True # Allows Pydantic to read SQLAlchemy models

class CardUpdate(BaseModel):
    title: str = None
    description: str = None
    status: str = None
    priority: str = None

class CardCreate(BaseModel):
    title: str
    description: str = None
    status: str = "Backlog"
    priority: str = "low"
    board_id: int

# --- 2. AUTH SCHEMAS ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None