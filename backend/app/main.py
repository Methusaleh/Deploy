import socketio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm  
from contextlib import asynccontextmanager
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel # <--- Added back in

# Local App Imports
from .database import engine, get_db
from . import models, schemas, auth_utils, crud
from .models import Base

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

# 5. Pydantic Schemas


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

@app.post("/boards/")
async def post_board(title: str, owner_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.create_board(db=db, title=title, owner_id=owner_id)

@app.post("/cards/")
async def create_card(card_in: schemas.CardCreate, db: AsyncSession = Depends(get_db)):
    new_card = models.Card(
        title=card_in.title,
        description=card_in.description,
        status=card_in.status,
        priority=card_in.priority,
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

@app.get("/users/{user_id}/boards/")
async def read_user_boards(user_id: int, db: AsyncSession = Depends(get_db)):
    boards = await crud.get_boards_by_user(db, user_id)
    return boards

@app.get("/boards/{board_id}/cards/")
async def read_board_cards(board_id: int, db: AsyncSession = Depends(get_db)):
    cards = await crud.get_cards_by_board(db, board_id)
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

@app.put("/cards/{card_id}")
async def update_card(card_id: int, card_update: schemas.CardUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Card).filter(models.Card.id == card_id))
    card = result.scalars().first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    update_data = card_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(card, key, value)

    try:
        await db.commit()
        await db.refresh(card)

        # 1. Targeted Broadcast: Only send to the specific board room
        await sio.emit("card_updated", {
            "id": card.id,
            "title": card.title,
            "description": card.description,
            "status": card.status,
            "priority": card.priority,
            "board_id": card.board_id
        }, room=str(card.board_id)) # <--- This is the key change
        
        return card

    except Exception as e:
        await db.rollback()
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail="Database update failed")