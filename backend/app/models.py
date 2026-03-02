from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase, validates
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
    
    # The generated handle (e.g., @aaron_kipf)
    handle = Column(String, unique=True, index=True, nullable=False)
    
    # Audit timestamps for that "Enterprise" feel
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    @validates('handle')
    def validate_handle(self, key, value):
        # If we didn't manually set a handle, generate it from names
        if not value and self.first_name and self.last_name:
            # Lowercase and replace spaces/special chars with underscores
            clean_first = re.sub(r'\W+', '', self.first_name.lower())
            clean_last = re.sub(r'\W+', '', self.last_name.lower())
            return f"@{clean_first}_{clean_last}"
        return value