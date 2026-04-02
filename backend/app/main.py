import socketio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer  
from contextlib import asynccontextmanager
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from jose import JWTError, jwt
from typing import List
from datetime import datetime, timezone

# Local App Imports
from .database import engine, get_db
from . import models, schemas, auth_utils, crud
from .models import Base
import app.auth_utils as auth_utils

# 1. Define the Lifespan logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # creates the tables in Neon if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield 

# 2. Initialize FastAPI
app = FastAPI(
    title="Deploy - V2",
    description="Kanban Board for Software Development",
    version="1.0.0",
    lifespan=lifespan
)

# --- AUTH DEPENDENCY ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Decode the JWT using your auth_utils constants
        payload = jwt.decode(
            token, 
            auth_utils.SECRET_KEY, 
            algorithms=[auth_utils.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # 2. Look up the user in Neon
    query = select(models.User).where(models.User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user

# 3. CORS Setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Socket.IO Setup
sio = socketio.AsyncServer(
    async_mode='asgi', 
    cors_allowed_origins=[]
)

# Create the ASGI wrapper
socket_app = socketio.ASGIApp(sio, app)

# CRITICAL: Mount the socket.io handler so the 404 error disappears
app.mount("/socket.io", socket_app)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def join_board(sid, board_id):
    await sio.enter_room(sid, str(board_id))
    print(f"Client {sid} joined board {board_id}")


# 6. Routes
@app.get("/")
async def health_check():
    return {"status": "online", "message": "Deploy API is running"}

@app.get("/test-user/{handle}")
async def test_user_connection(handle: str, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_handle(db, handle)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in Neon")
    return {
        "message": "Connection Successful!",
        "user": {
            "name": f"{user.first_name} {user.last_name}",
            "handle": user.handle,
            "email": user.email
        }
    }

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    # 1. Find the user by email (OAuth2Form uses 'username' field for the login ID)
    query = select(models.User).where(models.User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalars().first()

    # 2. Validate existence and password
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401, 
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Generate the token
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

import re # Make sure this is at the very top of main.py!

@app.post("/register", response_model=schemas.UserResponse)
async def register_user(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if email exists
    query = select(models.User).where(models.User.email == user_in.email)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Manual Handle Generation (The Fix)
    generated_handle = user_in.handle
    if not generated_handle:
        clean_first = re.sub(r'\W+', '', user_in.first_name.lower())
        clean_last = re.sub(r'\W+', '', user_in.last_name.lower())
        generated_handle = f"@{clean_first}_{clean_last}"

    # 3. Create user with the guaranteed handle
    new_user = models.User(
        email=user_in.email,
        hashed_password=auth_utils.hash_password(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        handle=generated_handle, # Pass the handle explicitly here
        is_active=True
    )
    
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except Exception as e:
        await db.rollback()
        print(f"Registration Error: {e}")
        raise HTTPException(status_code=500, detail="Database error during registration")

@app.post("/boards/", response_model=schemas.BoardResponse)
async def create_new_board(
    board_in: schemas.BoardCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    new_board = models.Board(
        title=board_in.title,
        owner_id=current_user.id  # Automatically sets the owner to YOU
    )
    db.add(new_board)
    await db.commit()
    await db.refresh(new_board)
    return new_board

@app.post("/cards/")
async def create_card(card_in: schemas.CardCreate, db: AsyncSession = Depends(get_db)):
    new_card = models.Card(
        title=card_in.title,
        description=card_in.description,
        status=card_in.status.lower(), # [cite: 285] Force lowercase
        priority=card_in.priority.lower(),
        board_id=card_in.board_id
    )
    db.add(new_card)
    try:
        await db.commit()
        await db.refresh(new_card)

        await sio.emit("card_created", {
            "id": new_card.id,
            "title": new_card.title,
            "description": new_card.description,
            "status": new_card.status,
            "priority": new_card.priority,
            "board_id": new_card.board_id
        }, room=str(new_card.board_id))

        return new_card
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/boards/me", response_model=List[schemas.BoardResponse])
async def get_my_boards(
    current_user: models.User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # This ensures users ONLY see boards where they are the owner
    query = select(models.Board).where(models.Board.owner_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/boards/{board_id}/cards/")
async def read_board_cards(board_id: int, db: AsyncSession = Depends(get_db)):
    cards = await crud.get_cards_by_board(db, board_id)
    return cards

@app.get("/cards/me", response_model=List[schemas.CardResponse])
async def read_my_global_cards(
    current_user: models.User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches all cards across all boards owned by the current user.
    Used for the Home Dashboard Global Feed.
    """
    cards = await crud.get_all_user_cards(db, current_user.id)
    return cards

@app.patch("/cards/{card_id}/status/")
async def update_card_status(card_id: int, new_status: str, db: AsyncSession = Depends(get_db)):
    updated_card = await crud.update_card_status(db, card_id, new_status)
    if not updated_card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Broadcast to everyone in the board's room
    await sio.emit("card_updated", {
        "id": card_id,
        "status": new_status,
        "board_id": updated_card.board_id
    }, room=str(updated_card.board_id))

    return updated_card

@app.delete("/boards/{board_id}/")
async def delete_board(board_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_board(db, board_id)
    if not success:
        raise HTTPException(status_code=404, detail="Board not found")
    return {"message": f"Board {board_id} and its cards deleted successfully"}

@app.delete("/cards/{card_id}")
async def delete_card(card_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Card).filter(models.Card.id == card_id))
    card = result.scalars().first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    board_id = card.board_id
    await db.delete(card)
    try:
        await db.commit()
        # Broadcast the deletion so other tabs remove it
        await sio.emit("card_deleted", {"id": card_id}, room=str(board_id))
        return {"message": "Card deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/cards/{card_id}", response_model=schemas.CardResponse)
async def update_card(card_id: int, card_update: schemas.CardUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Card).filter(models.Card.id == card_id))
    card = result.scalars().first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # 1. Extract the update data
    update_data = card_update.model_dump(exclude_unset=True)

    # 2. NEW: Force lowercase on status and priority immediately
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].lower()

    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].lower()
        
    # 3. EXISTING LOGIC: If status is changing, update the 'Last Moved' timestamp
    # Note: Now comparing lowercase 'deploy' or 'done'
    if "status" in update_data and update_data["status"] != card.status:
        card.last_moved_at = datetime.now(timezone.utc)
        
        # Updated to check for both 'done' and 'deploy' as "completed" states
        current_status = update_data["status"]
        if current_status == "done" or current_status == "deploy":
            card.completed_at = datetime.now(timezone.utc)
        else:
            card.completed_at = None

    # 4. Apply the rest of the updates to the database model
    for key, value in update_data.items():
        setattr(card, key, value)

    try:
        await db.commit()
        await db.refresh(card)

        # Broadcast the update to the board room
        await sio.emit("card_updated", {
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "status": card.status,
            "priority": card.priority,
            "board_id": card.board_id,
            "last_moved_at": card.last_moved_at.isoformat() if card.last_moved_at else None
        }, room=str(card.board_id))
        
        return card

    except Exception as e:
        await db.rollback()
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Database update failed")

    except Exception as e:
        await db.rollback()
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Database update failed")