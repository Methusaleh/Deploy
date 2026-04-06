// frontend/src/components/ShareModal.jsx
import { useState, useEffect } from "react";
import api from "../api/client";
import UserAvatar from "./UserAvatar";
import styles from "./ShareModal.module.css";

const ShareModal = ({ boardId, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        try {
          const res = await api.get(`/users/search?q=${query}`);
          setResults(res.data);
        } catch (err) {
          console.error("Search error:", err);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const sendInvite = async (userId) => {
    try {
      await api.post(`/boards/${boardId}/invite`, { recipient_id: userId });
      alert("Invitation sent!");
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Error sending invitation");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>Collaborators</h3>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by name or handle..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className={styles.resultsList}>
          {results.map((user) => (
            <div
              key={user.id}
              className={styles.userRow}
              onClick={() => sendInvite(user.id)}
            >
              <UserAvatar
                name={`${user.first_name} ${user.last_name}`}
                size={32}
              />
              <div className={styles.userDetails}>
                <span>
                  {user.first_name} {user.last_name}
                </span>
                <small>@{user.handle}</small>
              </div>
              <button className={styles.inviteBtn}>Invite</button>
            </div>
          ))}
          {query.length > 1 && results.length === 0 && (
            <p
              style={{ color: "#555", fontSize: "0.8rem", textAlign: "center" }}
            >
              No users found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
