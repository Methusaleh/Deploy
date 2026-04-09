from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import models

# search funtion by handle
async def get_user_by_handle(db: AsyncSession, handle: str):
    query = select(models.User).where(models.User.handle == handle)
    
    result = await db.execute(query)
    
    return result.scalars().first()

async def create_board(db: AsyncSession, title: str, owner_id: int):
    db_board = models.Board(title=title, owner_id=owner_id)
    db.add(db_board)
    await db.commit()
    await db.refresh(db_board)
    return db_board

async def create_card(db: AsyncSession, title: str, board_id: int, description: str = None):
    db_card = models.Card(title=title, board_id=board_id, description=description)
    db.add(db_card)
    await db.commit()
    await db.refresh(db_card)
    return db_card

async def get_boards_by_user(db: AsyncSession, user_id: int):
    query = select(models.Board).where(models.Board.owner_id == user_id)
    result = await db.execute(query)
    return result.scalars().all()

async def get_cards_by_board(db: AsyncSession, board_id: int):
    query = select(models.Card).where(models.Card.board_id == board_id)
    result = await db.execute(query)
    return result.scalars().all()

async def get_all_user_cards(db: AsyncSession, user_id: int):
    query = (
        select(models.Card)
        .join(models.Board)
        .where(models.Board.owner_id == user_id)
        .order_by(models.Card.due_date.asc(), models.Card.last_moved_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

async def update_card_status(db: AsyncSession, card_id: int, new_status: str):
    query = select(models.Card).where(models.Card.id == card_id)
    result = await db.execute(query)
    db_card = result.scalars().first()
    
    if db_card:
        db_card.status = new_status
        await db.commit()
        await db.refresh(db_card)
        return db_card
    return db_card

async def delete_board(db: AsyncSession, board_id: int):
    query = select(models.Board).where(models.Board.id == board_id)
    result = await db.execute(query)
    db_board = result.scalars().first()
    
    if db_board:
        await db.delete(db_board)
        await db.commit()
        return True
    return False

async def delete_card(db: AsyncSession, card_id: int):
    query = select(models.Card).where(models.Card.id == card_id)
    result = await db.execute(query)
    db_card = result.scalars().first()
    
    if db_card:
        await db.delete(db_card)
        await db.commit()
        return True
    return False