import { useEffect, useState, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useBoards } from "../context/BoardContext";
import {
  getBoardCards,
  updateCard,
  deleteOrLeaveBoard,
  getBoardDetails,
} from "../api/boards";
import Column from "./Column";
import styles from "./Board.module.css";
import Home from "./Home";
import ShareModal from "./ShareModal";
import ConfirmModal from "./ConfirmModal";
import MemberFacepile from "./MemberFacepile";

function Board() {
  const { activeBoard, cards, status, dispatch, userData } = useBoards();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Extract ID safely
  const { id } = activeBoard || {};
  const menuRef = useRef(null);

  // Consistent Column IDs (Sync these with your DB status values!)
  const COLUMNS = [
    { id: "backlog", title: "Backlog" },
    { id: "design", title: "Design" },
    { id: "development", title: "Development" },
    { id: "testing", title: "Testing" },
    { id: "deploy", title: "Deploy" },
  ];

  // Inside Board.jsx useEffect
  const lastFetchedId = useRef(null);

  useEffect(() => {
    if (!id) return;

    // If we've already fetched the details for THIS board ID, stop here.
    if (lastFetchedId.current === id) return;

    async function fetchBoardAndCards() {
      try {
        // 1. Fetch details
        const boardData = await getBoardDetails(id);

        // 2. Mark this ID as 'done' before updating state
        lastFetchedId.current = id;

        dispatch({ type: "setActiveBoard", payload: boardData });

        // 3. Fetch cards
        const cardData = await getBoardCards(id);
        dispatch({ type: "setCards", payload: cardData });
      } catch (err) {
        console.error("Board Fetch Error:", err);
      }
    }

    fetchBoardAndCards();
  }, [id, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteOrLeave = () => {
    setIsSettingsOpen(false); // Close the small dropdown menu
    setShowConfirm(true); // Open the big confirmation modal
  };

  const handleDeleteConfirm = async () => {
    setDeleteError(""); // Clear any previous errors
    try {
      await deleteOrLeaveBoard(activeBoard.id);
      setShowConfirm(false);
      dispatch({ type: "setActiveBoard", payload: null });
      window.location.reload();
    } catch (err) {
      console.error("Action failed:", err);
      // Capture the message instead of alerting it
      const msg =
        err.response?.data?.detail ||
        "Failed to process request. Please try again.";
      setDeleteError(msg);
    }
  };

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
            <div className={styles.contextGroup}>
              <h1>{activeBoard.title}</h1>
              <MemberFacepile
                members={activeBoard.members}
                owner={activeBoard.owner_id === userData?.id ? userData : null}
              />
            </div>
            <div className={styles.actionGroup}>
              <div className={styles.totalCount}>
                {cards.length} {cards.length === 1 ? "Card" : "Cards"}
              </div>

              <button
                className={styles.shareBtn}
                onClick={() => setIsShareModalOpen(true)}
              >
                <span className="material-icons">person_add</span>
                <span>Share</span>
              </button>

              <div className={styles.settingsWrapper} ref={menuRef}>
                <button
                  className={styles.settingsTrigger}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <span className="material-icons">settings</span>
                </button>

                {isSettingsOpen && (
                  <div className={styles.settingsDropdown}>
                    <div className={styles.settingsHeader}>
                      <span>Board Settings</span>
                    </div>

                    <div className={styles.settingsList}>
                      {/* We can add more items here later (e.g., Rename Board) */}

                      <button
                        className={styles.dangerAction}
                        onClick={() => {
                          setIsSettingsOpen(false);
                          handleDeleteOrLeave();
                        }}
                      >
                        <span className="material-icons">
                          {activeBoard.owner_id === userData.id
                            ? "delete_forever"
                            : "logout"}
                        </span>
                        {activeBoard.owner_id === userData.id
                          ? "Delete Board"
                          : "Leave Board"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

        {showConfirm && (
          <ConfirmModal
            title={
              activeBoard.owner_id === userData.id
                ? "Delete Board?"
                : "Leave Board?"
            }
            message={
              activeBoard.owner_id === userData.id
                ? "This will permanently delete the board and all cards for everyone. This cannot be undone."
                : "Are you sure you want to leave? You'll need an invite to get back in."
            }
            confirmText={
              activeBoard.owner_id === userData.id
                ? "Delete Everything"
                : "Leave Board"
            }
            isDanger={true}
            errorMessage={deleteError} // New Prop
            onConfirm={handleDeleteConfirm}
            onCancel={() => {
              setShowConfirm(false);
              setDeleteError(""); // Reset error when they close it
            }}
          />
        )}
      </div>
    </DragDropContext>
  );
}

export default Board;
