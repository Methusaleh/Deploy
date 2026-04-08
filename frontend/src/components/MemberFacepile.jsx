// frontend/src/components/MemberFacepile.jsx
import React from "react";
import UserAvatar from "./UserAvatar";
import styles from "./MemberFacepile.module.css";

const MemberFacepile = ({ members = [], owner }) => {
  let allParticipants = [];

  if (owner) {
    allParticipants.push(owner);
  }

  const otherMembers = members.filter((m) => m.id !== owner?.id);
  allParticipants = [...allParticipants, ...otherMembers];

  const limit = 4;
  const displayMembers = allParticipants.slice(0, limit);
  const extraCount = allParticipants.length - limit;

  return (
    <div className={styles.facepile}>
      {displayMembers.map((person) => (
        <div key={person.id} className={styles.avatarWrapper}>
          <UserAvatar
            name={
              person.full_name || `${person.first_name} ${person.last_name}`
            }
            size={28}
          />
        </div>
      ))}

      {extraCount > 0 && (
        <div className={styles.extraBubble}>+{extraCount}</div>
      )}
    </div>
  );
};

export default MemberFacepile;
