// frontend/src/components/CreateBoardModal.jsx
import React, { useState } from "react";
import api from "../api/client";
import styles from "./CreateBoardModal.module.css";

const CreateBoardModal = ({ onClose }) => {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/boards/", { title });

      // We force the context to reload the sidebar so the new board appears
      // (Assuming you have a way to refresh boards, or we just reload the page for V1)
      onClose();
    } catch (err) {
      console.error("Failed to create board:", err);
      setError("Failed to create board. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Board</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label>Board Title</label>
            <input
              type="text"
              placeholder="e.g. Q3 Launch, Bug Tracker..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;
