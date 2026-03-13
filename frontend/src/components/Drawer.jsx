import { useState, useEffect } from "react";
import { useBoards } from "../context/BoardContext";
import { updateCard } from "../api/boards";
import styles from "./Drawer.module.css";

function Drawer() {
  const { selectedCard, cards, dispatch } = useBoards();

  // Local state to hold the edits before saving
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize local state when the selectedCard changes
  useEffect(() => {
    if (selectedCard) {
      setTitle(selectedCard.title);
      setDescription(selectedCard.description || "");
    }
  }, [selectedCard]);

  const handleSave = async () => {
    if (!selectedCard) return;

    setIsSaving(true);
    try {
      const updatedCard = await updateCard(selectedCard.id, {
        title,
        description,
      });

      // Update the global cards array so the board reflects the change
      const updatedCards = cards.map((c) =>
        c.id === updatedCard.id ? updatedCard : c,
      );

      dispatch({ type: "setCards", payload: updatedCards });
      dispatch({ type: "closeDrawer" });
    } catch (err) {
      console.error("Failed to save card:", err);
      alert("Error saving changes. Check your console.");
    } finally {
      setIsSaving(false);
    }
  };

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
              <label className={styles.label}>Title</label>
              <input
                className={styles.titleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
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
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Drawer;
