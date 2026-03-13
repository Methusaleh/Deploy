from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import DeclarativeBase, validates, relationship
from datetime import datetime
import re

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    handle = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    boards = relationship("Board", back_populates="owner", cascade="all, delete-orphan")

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

    owner = relationship("User", back_populates="boards")

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