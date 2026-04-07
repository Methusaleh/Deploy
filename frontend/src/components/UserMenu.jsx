// frontend/src/components/UserMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import socket from "../api/socket";
import api from "../api/client";
import { useBoards } from "../context/BoardContext"; // 1. IMPORT HOOK
import UserAvatar from "./UserAvatar";
import styles from "./UserMenu.module.css";

const UserMenu = ({ onLogout }) => {
  // 2. EXTRACT CONTEXT
  const { cards, dispatch } = useBoards();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef(null);

  // 1. INITIALIZATION: Fetch User Profile and Notifications
  useEffect(() => {
    const initUserMenu = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return; // Guard clause if token is missing
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch User Profile
        const userRes = await fetch(
          `${import.meta.env.VITE_API_URL}/users/me`,
          { headers },
        );

        if (userRes.ok) {
          const user = await userRes.json();
          setUserData(user);

          // --- THE FIX ---
          // Synchronize this user data with the global BoardContext
          // This triggers the sidebar fetch in BoardContext.jsx
          dispatch({ type: "login", payload: user });

          socket.emit("join_user_room", user.id);
        }

        // 2. Fetch Notifications
        const notifRes = await fetch(
          `${import.meta.env.VITE_API_URL}/notifications`,
          { headers },
        );

        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
        }
      } catch (err) {
        console.error("UserMenu Init Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initUserMenu();
  }, [dispatch]); // Added dispatch here

  // 2. LIVE SOCKET LISTENER
  useEffect(() => {
    // Listen for real-time notifications (invites, mentions, etc.)
    socket.on("new_notification", (notif) => {
      console.log("Real-time notification received:", notif);

      // Update the local list so the red dot/dropdown updates immediately
      setNotifications((prev) => [notif, ...prev]);
    });

    // Cleanup the listener when the component unmounts
    return () => {
      socket.off("new_notification");
    };
  }, [socket]); // Adding socket here ensures the listener stays fresh

  // 3. UPDATED: CLEAR ALL (ARCHIVE ALL)
  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/clear-all`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setNotifications([]); // Clear from UI instantly
      }
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  // 4. MARK AS READ LOGIC
  const markAllAsRead = async () => {
    const unreadExist = notifications.some((n) => !n.is_read);
    if (!unreadExist) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  // 5. TELEPORT TO CARD
  const handleNotificationClick = (notif) => {
    if (!notif.card_id) return;

    const targetCard = cards.find((c) => c.id === notif.card_id);

    if (targetCard) {
      dispatch({ type: "setSelectedCard", payload: targetCard });
      setIsInboxOpen(false); // Close the bell
    }
  };

  // 6. DISMISS INDIVIDUAL (ARCHIVE)
  const dismissNotification = async (e, notifId) => {
    e.stopPropagation(); // Prevents handleNotificationClick from firing

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/${notifId}/archive`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const handleAcceptInvite = async (e, notifId) => {
    e.stopPropagation(); // Prevents clicking the button from triggering the background notification click
    try {
      // We use the 'api' instance which already has the Base URL and the Token interceptor
      const res = await api.post(`/boards/invitations/${notifId}/accept`);

      if (res.status === 200) {
        console.log("Joined board successfully!");

        // Remove the notification from the tray immediately
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));

        // Refresh to populate the new board in the sidebar
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to accept invite:", err);
      // This will now show the actual error from your FastAPI 'detail' field
      const errorMsg = err.response?.data?.detail || "Failed to join board.";
      alert(errorMsg);
    }
  };

  // UI HELPERS
  const toggleInbox = () => {
    const nextState = !isInboxOpen;
    setIsInboxOpen(nextState);
    setIsAccountOpen(false);
    if (nextState === true) markAllAsRead();
  };

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

  if (isLoading) return null;

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      {/* INBOX SECTION */}
      <div className={styles.inboxWrapper}>
        <div className={styles.bellIcon} onClick={toggleInbox}>
          <span className="material-icons">notifications</span>
          {unreadCount > 0 && (
            <span className={styles.notificationBadge}>{unreadCount}</span>
          )}
        </div>

        {isInboxOpen && (
          <div className={styles.inboxDropdown}>
            <div className={styles.inboxHeader}>
              <h3>Inbox</h3>
              <button
                className={styles.clearBtn}
                onClick={clearAllNotifications}
              >
                Clear All
              </button>
            </div>
            <div className={styles.inboxList}>
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={styles.notificationItem}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={styles.notifContent}>
                      <p>{n.message}</p>

                      {/* NEW: Accept Invitation Button */}
                      {n.type === "invite" && (
                        <button
                          className={styles.acceptInviteBtn}
                          onClick={(e) => handleAcceptInvite(e, n.id)}
                        >
                          Accept Invitation
                        </button>
                      )}

                      <span className={styles.timeAgo}>
                        {n.created_at
                          ? new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Just now"}
                      </span>
                    </div>
                    {/* DISMISS BUTTON (X) */}
                    <button
                      className={styles.dismissBtn}
                      onClick={(e) => dismissNotification(e, n.id)}
                    >
                      &times;
                    </button>
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

      {/* ACCOUNT SECTION */}
      <div
        className={styles.avatarWrapper}
        onClick={() => {
          setIsAccountOpen(!isAccountOpen);
          setIsInboxOpen(false);
        }}
      >
        <UserAvatar
          name={`${userData.first_name} ${userData.last_name}`}
          size={36}
        />
      </div>

      {isAccountOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>
              {`${userData.first_name} ${userData.last_name}`}
            </p>
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
