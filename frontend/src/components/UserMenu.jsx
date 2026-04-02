import React, { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.css";

const UserMenu = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      <div className={styles.avatarCircle} onClick={() => setIsOpen(!isOpen)}>
        <span>A</span>
      </div>

      {isOpen && (
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
