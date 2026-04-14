import { useState, useEffect, useRef } from "react";
import { useBoards } from "../context/BoardContext";
import { updateCard, createCard, deleteCard } from "../api/boards";
import styles from "./Drawer.module.css";

function Drawer() {
  const { selectedCard, cards, dispatch, activeBoard } = useBoards();
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
          <DrawerContent
            key={selectedCard.id}
            selectedCard={selectedCard}
            cards={cards}
            dispatch={dispatch}
            activeBoard={activeBoard}
          />
        )}
      </aside>
    </>
  );
}

function DrawerContent({ selectedCard, cards, dispatch, activeBoard }) {
  const [title, setTitle] = useState(selectedCard.title || "");
  const [description, setDescription] = useState(
    selectedCard.description || "",
  );
  const [assignedTo, setAssignedTo] = useState(selectedCard?.assigned_to || "");
  const [dueDate, setDueDate] = useState(
    selectedCard?.due_date ? selectedCard.due_date.split("T")[0] : "",
  );
  const [priority, setPriority] = useState(selectedCard.priority || "low");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commentInputRef = useRef(null);

  const isNew = selectedCard?.id === "new";

  useEffect(() => {
    if (isNew) return;

    const fetchComments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/cards/${selectedCard.id}/comments`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    };

    fetchComments();
  }, [selectedCard.id, isNew]);

  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      const activeItem = document.querySelector(`.${styles.activeSuggestion}`);
      if (activeItem) {
        activeItem.scrollIntoView({
          block: "nearest",
          inline: "start",
        });
      }
    }
  }, [selectedIndex, showSuggestions, suggestions.length]);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setCommentText(value);

    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.slice(1);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/users/search?q=${query}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("User search failed:", err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const applyMention = (userHandle) => {
    const words = commentText.split(" ");
    words.pop();
    setCommentText([...words, userHandle, ""].join(" "));
    setShowSuggestions(false);

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Tab") {
      if (suggestions[selectedIndex]) {
        e.preventDefault();
        applyMention(suggestions[selectedIndex].handle);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/cards/${selectedCard.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: commentText,
            card_id: selectedCard.id,
          }),
        },
      );

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }
    try {
      await deleteCard(selectedCard.id);
      const remainingCards = cards.filter((c) => c.id !== selectedCard.id);
      dispatch({ type: "setCards", payload: remainingCards });
      dispatch({ type: "closeDrawer" });
    } catch (err) {
      console.error("Delete failed:", err);
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      let result;
      const cardData = {
        title,
        description,
        priority,
        assigned_to: assignedTo === "" ? null : parseInt(assignedTo),
        due_date: dueDate === "" ? null : dueDate,
      };

      if (isNew) {
        result = await createCard({
          ...cardData,
          status: selectedCard.status,
          board_id: activeBoard.id,
        });
        dispatch({ type: "setCards", payload: [...cards, result] });
      } else {
        result = await updateCard(selectedCard.id, cardData);
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

  return (
    <div className={styles.content}>
      <span className={styles.statusBadge}>{selectedCard.status}</span>
      <div className={styles.metaRow}>
        <div className={styles.editGroup}>
          <label className={styles.label}>Assignee</label>
          <select
            className={styles.prioritySelect}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">Unassigned</option>
            {activeBoard?.members?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.editGroup}>
          <label className={styles.label}>Due Date</label>
          <input
            type="date"
            className={styles.dateInput}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>{" "}
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
      <div className={styles.actionRow}>
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
            onMouseLeave={() => setIsDeleting(false)}
          >
            {isDeleting ? "Confirm?" : "Delete"}
          </button>
        )}
      </div>
      {!isNew && (
        <div className={styles.commentSection}>
          <h4 className={styles.activityTitle}>Activity</h4>
          <div className={styles.commentList}>
            {comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>
                      {c.author_name}
                    </span>
                    <span className={styles.commentTime}>
                      {new Date(c.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className={styles.commentContent}>{c.content}</p>
                </div>
              ))
            ) : (
              <p className={styles.emptyComments}>No comments yet.</p>
            )}
          </div>

          <div className={styles.commentFormWrapper}>
            {showSuggestions && (
              <div className={styles.suggestionList}>
                {suggestions.map((user, index) => (
                  <div
                    key={user.id}
                    className={`${styles.suggestionItem} ${index === selectedIndex ? styles.activeSuggestion : ""}`}
                    onClick={() => applyMention(user.handle)}
                    onMosueEnter={() => setSelectedIndex(index)}
                  >
                    <span className={styles.suggestName}>
                      {user.first_name} {user.last_name}
                    </span>
                    <span className={styles.suggestHandle}>{user.handle}</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handlePostComment} className={styles.commentForm}>
              <input
                type="text"
                placeholder="Write a comment... use @ to mention"
                value={commentText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                ref={commentInputRef}
              />
              <button type="submit" disabled={!commentText.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Drawer;
