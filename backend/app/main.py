import socketio
import re
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer  
from contextlib import asynccontextmanager
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from jose import JWTError, jwt
from typing import List
from datetime import datetime, timezone

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
    "https://deploy-inky-one-23.vercel.app",
    "https://deploy-3o2uwq154-aaron-kipfs-projects.vercel.app"
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
async def heartbeat(sid, data):
    user_id = data.get("user_id")
    board_id = data.get("board_id") # Capture the board context
    if not user_id:
        return

    now = datetime.now(timezone.utc)

    async with AsyncSession(engine) as db:
        await db.execute(
            update(models.User)
            .where(models.User.id == user_id)
            .values(last_seen=now)
        )
        await db.commit()

    # BROADCAST: Tell everyone on this board that this user is active
    if board_id:
        await sio.emit("presence_update", {
            "user_id": user_id,
            "last_seen": now.isoformat()
        }, room=str(board_id))

@sio.event
async def join_board(sid, board_id):
    await sio.enter_room(sid, str(board_id))
    print(f"Client {sid} joined board {board_id}")

@sio.event
async def join_user_room(sid, user_id):
    await sio.enter_room(sid, f"user_{user_id}")
    print(f"Client {sid} joined private room user_{user_id}")


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

@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    Used by the frontend to initialize the UserMenu and Socket rooms.
    """
    return current_user

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
    from sqlalchemy.orm import selectinload
    
    new_board = models.Board(
        title=board_in.title,
        owner_id=current_user.id
    )
    db.add(new_board)
    await db.commit()
    
    # RE-QUERY with selectinload to satisfy the schema's member requirement
    query = (
        select(models.Board)
        .options(selectinload(models.Board.members))
        .where(models.Board.id == new_board.id)
    )
    result = await db.execute(query)
    board_with_data = result.scalar_one()

    # Trigger the real-time sync
    try:
        await sio.emit("refresh_boards", {}, room=f"user_{current_user.id}")
    except Exception as e:
        print(f"Socket error: {e}")

    return board_with_data

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
    from sqlalchemy.orm import selectinload
    
    query = (
        select(models.Board)
        .options(selectinload(models.Board.members)) # ADD THIS for the facepile!
        .outerjoin(models.board_members)
        .where(
            (models.Board.owner_id == current_user.id) | 
            (models.board_members.c.user_id == current_user.id)
        )
    )
    
    result = await db.execute(query)
    return result.scalars().unique().all()

# backend/app/main.py

@app.get("/boards/{board_id}", response_model=schemas.BoardResponse)
async def get_board_details(
    board_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy.orm import selectinload
    # 1. Fetch board and explicitly include the members relationship
    query = (
        select(models.Board)
        .options(selectinload(models.Board.members))
        .where(models.Board.id == board_id)
    )
    result = await db.execute(query)
    board = result.scalar_one_or_none()
    
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    # 2. Security Check: Ensure user is owner or member
    member_ids = [m.id for m in board.members]
    if board.owner_id != current_user.id and current_user.id not in member_ids:
        raise HTTPException(status_code=403, detail="Not a member of this board")

    return board

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

@app.get("/notifications", response_model=List[schemas.NotificationResponse])
async def get_notifications(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(
        select(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .filter(models.Notification.is_archived == False) # <--- ONLY ACTIVE
        .order_by(models.Notification.created_at.desc())
    )
    return result.scalars().all()

@app.post("/notifications/read")
async def mark_notifications_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Marks all unread notifications for the current user as read.
    """
    from sqlalchemy import update
    
    query = (
        update(models.Notification)
        .where(models.Notification.user_id == current_user.id)
        .where(models.Notification.is_read == False)
        .values(is_read=True)
    )
    
    await db.execute(query)
    await db.commit()
    
    return {"message": "Notifications marked as read"}

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
async def update_card(
    card_id: int, 
    card_update: schemas.CardUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Needed to know who to notify
):
    result = await db.execute(select(models.Card).filter(models.Card.id == card_id))
    card = result.scalars().first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # 1. Extract the update data
    update_data = card_update.model_dump(exclude_unset=True)

    # 2. Force lowercase on status and priority immediately
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].lower()

    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].lower()
        
    # 3. STATUS CHANGE LOGIC: Timestamps + Notifications
    if "status" in update_data and update_data["status"] != card.status:
        old_status = card.status
        new_status = update_data["status"]
        card.last_moved_at = datetime.now(timezone.utc)
        
        # Update completion dates
        if new_status in ["done", "deploy"]:
            card.completed_at = datetime.now(timezone.utc)
        else:
            card.completed_at = None

        # JIRA LOGIC: Create an automated notification for the Inbox
        new_notification = models.Notification(
            type="status_change",
            message=f"Task '{card.title}' moved from {old_status.upper()} to {new_status.upper()}",
            user_id=current_user.id, 
            card_id=card.id
        )
        db.add(new_notification)

        await db.flush()

        await sio.emit("new_notification", {
            "id": new_notification.id,
            "message": new_notification.message,
            "card_id": new_notification.card_id,
            "type": new_notification.type
        }, room=f"user_{current_user.id}")    

    # 4. Apply the rest of the updates to the database model
    for key, value in update_data.items():
        setattr(card, key, value)

    try:
        await db.commit()
        await db.refresh(card)

        # Broadcast the update to the board room via Socket.io
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
    
# --- COMMENT ROUTES ---

@app.post("/cards/{card_id}/comments", response_model=schemas.CommentResponse)
async def create_comment(
    card_id: int,
    comment_in: schemas.CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Save the comment and COMMIT immediately
    # This ensures the record exists in Neon before we trigger any secondary logic
    new_comment = models.Comment(
        content=comment_in.content,
        card_id=card_id,
        user_id=current_user.id
    )
    db.add(new_comment)
    
    try:
        await db.commit()
        await db.refresh(new_comment)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save comment")

    # 2. MENTION LOGIC: Now that the comment is "Safe", search for handles
    mentions = re.findall(r"@(\w+)", comment_in.content)
    
    for handle in mentions:
        user_query = await db.execute(
            select(models.User).filter(models.User.handle == f"@{handle}")
        )
        mentioned_user = user_query.scalars().first()
        
        if mentioned_user:
            # Create the mention notification
            new_notif = models.Notification(
                type="mention",
                message=f"{current_user.first_name} mentioned you in a comment",
                user_id=mentioned_user.id,
                card_id=card_id
            )
            db.add(new_notif)
            await db.flush() # flush is fine here since we commit below
            
            # Ping their private socket room
            await sio.emit("new_notification", {
                "id": new_notif.id,
                "message": new_notif.message,
                "card_id": card_id,
                "type": "mention"
            }, room=f"user_{mentioned_user.id}")

    # Final commit for any created notifications
    await db.commit()
    
    # 3. Manually attach the name for the frontend response
    new_comment.author_name = f"{current_user.first_name} {current_user.last_name}"
    return new_comment

@app.get("/cards/{card_id}/comments", response_model=List[schemas.CommentResponse])
async def get_comments(card_id: int, db: AsyncSession = Depends(get_db)):
    query = (
        select(
            models.Comment,
            (models.User.first_name + " " + models.User.last_name).label("author_name")
        )
        .join(models.User, models.Comment.user_id == models.User.id)
        .filter(models.Comment.card_id == card_id)
        .order_by(models.Comment.created_at.desc())
    )
    
    result = await db.execute(query)
    
    comments_with_authors = []
    for comment_obj, author_name in result.all():
        # This matches the 'author_name' property we set in create_comment
        comment_obj.author_name = author_name
        comments_with_authors.append(comment_obj)
        
    return comments_with_authors

@app.get("/users/search", response_model=List[schemas.UserResponse])
async def search_users(
    q: str, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Search users for mentions or board invitations, excluding self."""
    # Clean the query: remove '@' if the user typed it, so we search the raw string
    clean_q = q.replace("@", "").lower()
    search_term = f"%{clean_q}%"

    query = (
        select(models.User)
        .where(
            (
                (models.User.first_name.ilike(search_term)) | 
                (models.User.last_name.ilike(search_term)) |
                (models.User.handle.ilike(search_term)) |
                (models.User.email.ilike(search_term))
            ) & 
            (models.User.id != current_user.id)
        )
        .limit(5)
    )
    result = await db.execute(query)
    return result.scalars().all()

@app.post("/notifications/clear-all")
async def clear_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Hides all notifications from the UI by archiving them.
    They remain in the DB but won't be fetched by the GET /notifications route.
    """
    from sqlalchemy import update
    
    query = (
        update(models.Notification)
        .where(models.Notification.user_id == current_user.id)
        .values(is_archived=True, is_read=True) # Usually, archiving implies you've 'seen' them
    )
    
    await db.execute(query)
    await db.commit()
    
    return {"message": "Notifications archived and cleared from view"}

@app.post("/notifications/{notif_id}/archive")
async def archive_single_notification(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy import update
    
    query = (
        update(models.Notification)
        .where(models.Notification.id == notif_id)
        .where(models.Notification.user_id == current_user.id)
        .values(is_archived=True)
    )
    
    await db.execute(query)
    await db.commit()
    
    return {"message": "Notification dismissed"}

@app.post("/boards/{board_id}/invite")
async def invite_to_board(
    board_id: int,
    invite_data: schemas.InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Verify Board Ownership
    board_query = await db.execute(select(models.Board).where(models.Board.id == board_id))
    board = board_query.scalar_one_or_none()
    
    if not board or board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the board owner can invite members")

    # 2. Check if user is already a member
    member_check = await db.execute(
        select(models.User).join(models.Board.members).where(
            models.Board.id == board_id,
            models.User.id == invite_data.recipient_id
        )
    )
    if member_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this board")

    # 3. Create the Invitation Record
    new_invite = models.BoardInvitation(
        board_id=board_id,
        sender_id=current_user.id,
        recipient_id=invite_data.recipient_id,
        status="pending"
    )
    db.add(new_invite)
    
    # 4. Create an In-App Notification 
    # FIX: 'link' removed as it is not a valid column in your models.py
    new_notif = models.Notification(
        user_id=invite_data.recipient_id,
        message=f"{current_user.first_name} invited you to join the board: {board.title}",
        type="invite"
    )
    db.add(new_notif)
    
    try:
        await db.commit()
        await db.refresh(new_notif) # Refresh to get the generated ID and created_at
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create invitation")

    # 5. Socket.io Real-time Alert
    await sio.emit("new_notification", {
        "id": new_notif.id,
        "message": new_notif.message,
        "created_at": str(new_notif.created_at),
        "type": "invite" # Added type so frontend knows how to style it
    }, room=f"user_{invite_data.recipient_id}")

    return {"message": "Invitation sent successfully"}

@app.post("/boards/invitations/{notif_id}/accept")
async def accept_invitation(
    notif_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Find the Notification to confirm context
    notif_query = await db.execute(
        select(models.Notification).where(models.Notification.id == notif_id)
    )
    notification = notif_query.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # 2. Find the pending invitation for this user
    # We look for the most recent pending invite for the recipient
    invite_query = select(models.BoardInvitation).where(
        models.BoardInvitation.recipient_id == current_user.id,
        models.BoardInvitation.status == "pending"
    ).order_by(models.BoardInvitation.created_at.desc())
    
    result = await db.execute(invite_query)
    invitation = result.scalars().first()

    if not invitation:
        raise HTTPException(status_code=404, detail="No pending invitation found for this user")

    # 3. Get the board associated with the invitation
    # We use selectinload to ensure we can modify the members relationship safely
    from sqlalchemy.orm import selectinload
    board_query = await db.execute(
        select(models.Board)
        .options(selectinload(models.Board.members))
        .where(models.Board.id == invitation.board_id)
    )
    board = board_query.scalar_one_or_none()
    
    if not board:
        raise HTTPException(status_code=404, detail="Board no longer exists")

    # 4. Add user to board members
    # Checking against board.members is more direct since we loaded it above
    if current_user not in board.members:
        board.members.append(current_user)
    
    # 5. Update status and Archive the notification
    invitation.status = "accepted"
    notification.is_archived = True
    notification.is_read = True
    
    try:
        await db.commit()
        await sio.emit("refresh_boards", {}, room=f"user_{current_user.id}")

        return {"message": "Successfully joined the board", "board_id": board.id}
    except Exception as e:
        await db.rollback()
        print(f"Accept Error: {e}")
        raise HTTPException(status_code=500, detail="Database error during acceptance")
    
@app.post("/boards/invitations/{notif_id}/decline")
async def decline_invitation(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Verify the notification exists
    notif_query = await db.execute(select(models.Notification).where(models.Notification.id == notif_id))
    notification = notif_query.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # 2. Find the most recent pending invitation for this user
    invite_query = select(models.BoardInvitation).where(
        models.BoardInvitation.recipient_id == current_user.id,
        models.BoardInvitation.status == "pending"
    ).order_by(models.BoardInvitation.created_at.desc())
    
    result = await db.execute(invite_query)
    invitation = result.scalars().first()

    if not invitation:
        raise HTTPException(status_code=404, detail="No pending invitation found")

    # 3. Update status to declined and archive the notification
    invitation.status = "declined"
    notification.is_archived = True
    notification.is_read = True
    
    await db.commit()
    
    return {"message": "Invitation declined"}

@app.delete("/boards/{board_id}")
async def delete_board(
    board_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy.orm import selectinload
    
    # 1. Fetch board with members PRE-LOADED to avoid Greenlet errors
    query = await db.execute(
        select(models.Board)
        .options(selectinload(models.Board.members))
        .where(models.Board.id == board_id)
    )
    board = query.scalar_one_or_none()

    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    # 2. Store info for notifications before database actions
    owner_id = board.owner_id
    member_ids = [m.id for m in board.members]

    # --- CASE A: OWNER DELETES BOARD ---
    if owner_id == current_user.id:
        await db.delete(board)
        await db.commit()

        # Notify everyone via socket safely
        try:
            await sio.emit("refresh_boards", {}, room=f"user_{owner_id}")
            for m_id in member_ids:
                await sio.emit("refresh_boards", {}, room=f"user_{m_id}")
        except Exception as e:
            print(f"Socket emit failed: {e}")

        return {"message": "Board and all its cards have been deleted"}

    # --- CASE B: MEMBER LEAVES BOARD ---
    if current_user in board.members:
        board.members.remove(current_user)
        await db.commit()
        
        # Notify the user who left to refresh their sidebar
        try:
            await sio.emit("refresh_boards", {}, room=f"user_{current_user.id}")
        except Exception as e:
            print(f"Socket emit failed: {e}")
            
        return {"message": "You have left the board"}
    
    raise HTTPException(status_code=403, detail="You do not have permission to modify this board")