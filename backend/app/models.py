from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Table, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, validates, relationship
from datetime import datetime
import re

class Base(DeclarativeBase):
    pass

# --- 1. NEW ASSOCIATION TABLE ---
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
    # Set nullable=True so Google users aren't forced to have a local password
    hashed_password = Column(String, nullable=True) 
    
    # NEW: For Google Login later
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    handle = Column(String, unique=True, index=True, nullable=False)
    bio = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships (kept from previous step)
    owned_boards = relationship("Board", back_populates="owner", cascade="all, delete-orphan")
    shared_boards = relationship("Board", secondary=board_members, back_populates="members")

    @validates('handle')
    def validate_handle(self, key, value):
        # Your regex logic is great—keeping it!
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
    
    # This links back to the User's shared_boards
    members = relationship("User", secondary=board_members, back_populates="shared_boards")
    
    cards = relationship("Card", back_populates="board", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Backlog")
    priority = Column(String, default="low")
    board_id = Column(Integer, ForeignKey("boards.id"))
    
    board = relationship("Board", back_populates="cards")