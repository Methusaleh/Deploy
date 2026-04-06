import { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useBoards } from "../context/BoardContext";
import { getBoardCards, updateCard } from "../api/boards";
import Column from "./Column";
import styles from "./Board.module.css";
import Home from "./Home";
import ShareModal from "./ShareModal";

function Board() {
  const { activeBoard, cards, status, dispatch } = useBoards();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Extract ID safely
  const { id } = activeBoard || {};

  // Consistent Column IDs (Sync these with your DB status values!)
  const COLUMNS = [
    { id: "backlog", title: "Backlog" },
    { id: "design", title: "Design" },
    { id: "development", title: "Development" },
    { id: "testing", title: "Testing" },
    { id: "deploy", title: "Deploy" },
  ];

  useEffect(
    function () {
      if (!id) return;

      async function fetchCards() {
        try {
          dispatch({ type: "loading" });
          const data = await getBoardCards(id);
          dispatch({ type: "setCards", payload: data });
        } catch (err) {
          console.error("Board Fetch Error:", err);
          dispatch({ type: "error", payload: err.message });
        }
      }

      fetchCards();
    },
    [id, dispatch],
  );

  // This function runs the moment you let go of a dragged card
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // 1. If dropped outside a list or in the same spot, do nothing
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // 2. Optimistic UI Update: Move the card in our local state immediately
    // draggableId is the card's ID
    const updatedCards = cards.map((card) =>
      card.id.toString() === draggableId
        ? { ...card, status: destination.droppableId }
        : card,
    );

    dispatch({ type: "setCards", payload: updatedCards });

    // 3. Persist to Database
    try {
      // destination.droppableId is the new column ID (e.g., 'testing')
      await updateCard(draggableId, { status: destination.droppableId });

      // Note: Your Python backend should emit "card_updated" via Socket.IO
      // once this update is successful.
    } catch (err) {
      console.error("Failed to update card status:", err);
      // Optional: you could re-fetch cards here to 'roll back' the UI if the save fails
    }
  };

  // 1. Guard for no board selected
  if (!activeBoard) {
    return <Home />;
  }

  // 2. Loading state (only show if we don't have cards yet)
  if (status === "loading" && cards.length === 0) {
    return (
      <div className={styles.boardContainer}>
        <p className={styles.message}>Loading cards...</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.boardContainer}>
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.titleGroup}>
              <h1>{activeBoard.title}</h1>
              <button
                className={styles.shareBtn}
                onClick={() => setIsShareModalOpen(true)}
              >
                <span className="material-icons">person_add</span>
                <span>Share</span>
              </button>
            </div>

            <div className={styles.totalCount}>{cards.length} Cards</div>
          </div>
        </header>

        <div className={styles.grid}>
          {COLUMNS.map((column) => {
            const columnCards = cards.filter(
              (card) => card.status?.toLowerCase() === column.id.toLowerCase(),
            );

            return (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                cards={columnCards}
                dispatch={dispatch}
              />
            );
          })}
        </div>

        {isShareModalOpen && (
          <ShareModal
            boardId={activeBoard.id}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}
      </div>
    </DragDropContext>
  );
}

export default Board;
