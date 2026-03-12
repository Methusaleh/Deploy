import socketio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware  
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, get_db
from .models import Base
from . import crud



# 1. Define the Lifespan logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # creates the tables in Neon if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield  # The app stays "alive" here
    
    # --- Shutdown Logic (Optional) ---
    # Any cleanup goes here (closing connections, etc.)

# lifespan
app = FastAPI(
    title="Deploy - V2",
    description="Kanban Board for Software Development",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def join_board(sid, board_id):
    await sio.enter_room(sid, str(board_id))
    print(f"Client {sid} joined board {board_id}")

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Deploy API is running"}

@app.get("/test-user/{handle}")
async def test_user_connection(handle: str, db: AsyncSession = Depends(get_db)):
    # Use the CRUD function to find the user
    user = await crud.get_user_by_handle(db, handle)
    
    # If the librarian finds nothing, tell the user
    if not user:
        raise HTTPException(status_code=404, detail="User not found in Neon")
    
    # If found, return the info (but NOT the password hash!)
    return {
        "message": "Connection Successful!",
        "user": {
            "name": f"{user.first_name} {user.last_name}",
            "handle": user.handle,
            "email": user.email
        }
    }

@app.post("/boards/")
async def post_board(title: str, owner_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.create_board(db=db, title=title, owner_id=owner_id)

@app.post("/cards/")
async def post_card(title: str, board_id: int, description: str = None, db: AsyncSession = Depends(get_db)):
    return await crud.create_card(db=db, title=title, board_id=board_id, description=description)

@app.get("/users/{user_id}/boards/") #set this up for websocket logic later
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
    
    await sio.emit("card_updated", {
        "card_id": card_id,
        "status": new_status},
        room=str(updated_card.board_id)
    )

    return updated_card
    

@app.delete("/boards/{board_id}/")
async def delete_board(board_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_board(db, board_id)
    if not success:
        raise HTTPException(status_code=404, detail="Board not found")
    return {"message": f"Board {board_id} and its cards deleted successfully"}

@app.delete("/cards/{card_id}/")
async def delete_card(card_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_card(db, card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"message": f"Card {card_id} deleted successfully"}