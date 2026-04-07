// frontend/src/components/ShareModal.jsx
import { useState, useEffect } from "react";
import api from "../api/client";
import UserAvatar from "./UserAvatar";
import styles from "./ShareModal.module.css";

const ShareModal = ({ boardId, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

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

  const toggleUserSelection = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const sendAllInvites = async () => {
    try {
      // Loop through selected users and send invites
      const promises = selectedUsers.map((user) =>
        api.post(`/boards/${boardId}/invite`, { recipient_id: user.id }),
      );

      await Promise.all(promises);
      console.log(`Sent ${selectedUsers.length} invitations!`);
      onClose();
    } catch (err) {
      // Access the detailed error message from the backend response
      const errorMessage =
        err.response?.data?.detail || "Some invitations failed to send.";
      console.error("Invite Error:", err);
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>Collaborators</h3>

        {/* Selected Users "Chips" Area */}
        <div className={styles.stagingArea}>
          {selectedUsers.map((user) => (
            <div key={user.id} className={styles.userChip}>
              {user.first_name}
              <span onClick={() => toggleUserSelection(user)}>×</span>
            </div>
          ))}
        </div>

        <input
          className={styles.searchInput}
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className={styles.resultsList}>
          {results.map((user) => (
            <div
              key={user.id}
              className={`${styles.userRow} ${selectedUsers.find((u) => u.id === user.id) ? styles.selected : ""}`}
              onClick={() => toggleUserSelection(user)}
            >
              <UserAvatar
                name={`${user.first_name} ${user.last_name}`}
                size={32}
              />
              <div className={styles.userDetails}>
                <span>
                  {user.first_name} {user.last_name}
                </span>
                {/* Fix: Only show @ if the handle doesn't already have it */}
                <small>
                  {user.handle.startsWith("@")
                    ? user.handle
                    : `@${user.handle}`}
                </small>
              </div>
              <div className={styles.checkbox}>
                {selectedUsers.find((u) => u.id === user.id)
                  ? "check_circle"
                  : "add_circle"}
              </div>
            </div>
          ))}
        </div>

        <button
          className={styles.mainInviteBtn}
          disabled={selectedUsers.length === 0}
          onClick={sendAllInvites}
        >
          Send {selectedUsers.length} Invitation
          {selectedUsers.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
