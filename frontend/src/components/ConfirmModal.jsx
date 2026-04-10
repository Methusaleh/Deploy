import React from "react";
import styles from "./ConfirmModal.module.css";

const ConfirmModal = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  isDanger = false,
  errorMessage = "",
}) => {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
        </div>

        <div className={styles.modalBody}>
          <p>{message}</p>

          {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={isDanger ? styles.dangerBtn : styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
