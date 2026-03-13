import { useBoards } from "../context/BoardContext";
import styles from "./Drawer.module.css";

function Drawer() {
  const { selectedCard, dispatch } = useBoards();

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
          <div className={styles.content}>
            <span className={styles.statusBadge}>{selectedCard.status}</span>
            <h2 className={styles.title}>{selectedCard.title}</h2>
            <p className={styles.description}>
              {selectedCard.description} || "No description provided."
            </p>
            {/* Later: Add Edit Form here */}
          </div>
        )}
      </aside>
    </>
  );
}

export default Drawer;
