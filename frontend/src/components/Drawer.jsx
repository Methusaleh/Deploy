import { useState } from "react";
import { useBoards } from "../context/BoardContext";
import { updateCard, createCard, deleteCard } from "../api/boards";
import styles from "./Drawer.module.css";

function Drawer() {
  const { selectedCard, cards, dispatch, activeBoard } = useBoards();

  // Local state to hold the edits before saving
  const [title, setTitle] = useState(selectedCard?.title || "");
  const [description, setDescription] = useState(
    selectedCard?.description || "",
  );
  const [priority, setPriority] = useState(selectedCard?.priority || "low");
  const [saveStatus, setSaveStatus] = useState("idle");

  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize local state when the selectedCard changes
  // useEffect(() => {
  //   if (selectedCard) {
  //     setTitle(selectedCard.title);
  //     setDescription(selectedCard.description || "");
  //   }
  // }, [selectedCard]);

  const isNew = selectedCard?.id === "new";

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true); // First click: show confirmation
      return;
    }

    // Second click: perform the delete
    try {
      await deleteCard(selectedCard.id);

      // Remove the card from the local list immediately
      const remainingCards = cards.filter((c) => c.id !== selectedCard.id);
      dispatch({ type: "setCards", payload: remainingCards });

      dispatch({ type: "closeDrawer" });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Could not delete card.");
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      let result;
      if (isNew) {
        result = await createCard({
          title,
          description,
          priority,
          status: selectedCard.status, // The column we clicked '+' in
          board_id: activeBoard.id, // From your context
        });
        // Add the new card to the global list
        dispatch({ type: "setCards", payload: [...cards, result] });
      } else {
        result = await updateCard(selectedCard.id, {
          title,
          description,
          priority,
        });
        const updatedCards = cards.map((c) =>
          c.id === result.id ? result : c,
        );
        dispatch({ type: "setCards", payload: updatedCards });
      }

      setSaveStatus("saved");

      setTimeout(() => {
        dispatch({ type: "closeDrawer" });
        setSaveStatus("idle");
      }, 600);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("idle");
    }
  };

  // D. Guard Clauses
  const isOpen = !!selectedCard;

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.show : ""}`}
        onClick={() => dispatch({ type: "closeDrawer" })}
      />

      <aside className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <button
            className={styles.closeBtn}
            onClick={() => dispatch({ type: "closeDrawer" })}
          >
            &times;
          </button>
        </div>

        {selectedCard && (
          <div className={styles.content}>
            <span className={styles.statusBadge}>{selectedCard.status}</span>

            <div className={styles.editGroup}>
              <label className={styles.label}>Priority</label>
              <select
                className={styles.prioritySelect}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className={styles.editGroup}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.titleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                autoFocus={isNew}
              />
            </div>

            <div className={styles.editGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.descInput}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a more detailed description..."
              />
            </div>

            <button
              className={`${styles.saveBtn} ${saveStatus === "saved" ? styles.saved : ""}`}
              onClick={handleSave}
              disabled={saveStatus !== "idle"}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "✓ Saved"
                  : "Save Changes"}
            </button>
            {!isNew && (
              <button
                className={`${styles.deleteBtn} ${isDeleting ? styles.confirmDelete : ""}`}
                onClick={handleDelete}
                onMouseLeave={() => setIsDeleting(false)} // Reset if user moves mouse away
              >
                {isDeleting ? "Confirm Delete?" : "Delete Task"}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default Drawer;
