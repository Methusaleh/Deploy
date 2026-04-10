import React from "react";
import styles from "./UserAvatar.module.css";

const COLORS = [
  "#475569", // Slate
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#d97706", // Amber
  "#e11d48", // Rose
  "#7c3aed", // Violet
];

const UserAvatar = ({ name, size = 40, isActive = false }) => {
  const getInitials = (str) => {
    if (!str || str.includes("undefined")) return "AK";
    const parts = str.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  };

  const dynamicStyle = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: getColor(name || ""),
    fontSize: `${size * 0.4}px`,
  };

  return (
    <div
      className={styles.container}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className={styles.avatar} style={dynamicStyle} title={name}>
        {getInitials(name)}
      </div>

      {isActive && <div className={styles.indicator} />}
    </div>
  );
};

export default UserAvatar;
