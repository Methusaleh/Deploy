// frontend/src/components/UserMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";

const UserMenu = ({ onLogout }) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [notifications, setNotifications] = useState([]); // We'll fetch these soon
  const menuRef = useRef(null);

  // Close menus if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsAccountOpen(false);
        setIsInboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      {/* INBOX BELL */}
      <div className={styles.inboxWrapper}>
        <div
          className={styles.bellIcon}
          onClick={() => {
            setIsInboxOpen(!isInboxOpen);
            setIsAccountOpen(false);
          }}
        >
          <span className="material-icons">notifications</span>
          {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount}</span>
          )}
        </div>

        {isInboxOpen && (
          <div className={styles.inboxDropdown}>
            <div className={styles.inboxHeader}>
              <h3>Inbox</h3>
              <button className={styles.clearBtn}>Clear All</button>
            </div>
            <div className={styles.inboxList}>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={styles.notificationItem}
                    data-unread={!n.is_read}
                  >
                    <p>{n.message}</p>
                    <span className={styles.timeAgo}>Just now</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyInbox}>
                  <p>All caught up!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* USER AVATAR */}
      <div
        className={styles.avatarCircle}
        onClick={() => {
          setIsAccountOpen(!isAccountOpen);
          setIsInboxOpen(false);
        }}
      >
        <span>A</span>
      </div>

      {isAccountOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>Aaron</p>
            <p className={styles.userRole}>Lead Developer</p>
          </div>
          <div className={styles.divider}></div>
          <button className={styles.logoutBtn} onClick={onLogout}>
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
