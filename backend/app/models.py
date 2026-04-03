from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, validates, relationship
from datetime import datetime
import re

# 1. Define the Base class here instead of importing it
# This is the modern SQLAlchemy 2.0 way.
class Base(DeclarativeBase):
    pass

# --- 2. ASSOCIATION TABLE ---
# This links users to boards they have been invited to.
board_members = Table(
    "board_members",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("board_id", ForeignKey("boards.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) 
    
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    handle = Column(String, unique=True, index=True, nullable=False)
    bio = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    owned_boards = relationship("Board", back_populates="owner", cascade="all, delete-orphan")
    shared_boards = relationship("Board", secondary=board_members, back_populates="members")

    @validates('handle')
    def validate_handle(self, key, value):
        if not value and self.first_name and self.last_name:
            clean_first = re.sub(r'\W+', '', self.first_name.lower())
            clean_last = re.sub(r'\W+', '', self.last_name.lower())
            return f"@{clean_first}_{clean_last}"
        return value
    
class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    owner = relationship("User", back_populates="owned_boards")
    members = relationship("User", secondary=board_members, back_populates="shared_boards")
    cards = relationship("Card", back_populates="board", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Backlog")
    priority = Column(String, default="low")
    
    # Time-tracking fields for Dashboard/Stale logic
    due_date = Column(DateTime(timezone=True), nullable=True)
    last_moved_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    board_id = Column(Integer, ForeignKey("boards.id"))
    board = relationship("Board", back_populates="cards")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    # Back-references
    author = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String) # e.g., "mention", "status_change", "assignment"
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Who receives the notification
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    # Link to the specific card so clicking the notification opens it
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)