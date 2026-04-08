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
        from_attributes = True 

# --- 2. CARD SCHEMAS ---

# This is the "Parent" schema to avoid repeating fields
class CardBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "Backlog"
    priority: Optional[str] = "low"

class CardCreate(CardBase):
    board_id: int

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class CardResponse(CardBase):
    id: int
    board_id: int
    last_moved_at: datetime
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- 3. AUTH SCHEMAS ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- 4. BOARD SCHEMAS ---

class BoardBase(BaseModel):
    title: str

class BoardCreate(BoardBase):
    pass

class BoardResponse(BoardBase):
    id: int
    owner_id: int
    members: List[UserResponse] = []

    class Config:
        from_attributes = True

        # --- COMMENT SCHEMAS ---
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    card_id: int

class CommentResponse(CommentBase):
    id: int
    created_at: datetime
    user_id: int
    card_id: int
    # We'll include the author's name for the UI
    author_name: Optional[str] = None 

    class Config:
        from_attributes = True

# --- NOTIFICATION SCHEMAS ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int  # Keep this!
    message: str
    # This is the "Fix" for the 500 error
    type: Optional[str] = None 
    is_read: bool
    is_archived: bool
    created_at: datetime
    card_id: Optional[int] = None

    class Config:
        from_attributes = True

class InvitationCreate(BaseModel):
    recipient_id: int