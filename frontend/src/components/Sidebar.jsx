import { useState } from "react"; // Added missing import
import { useBoards } from "../context/BoardContext";
import CreateBoardModal from "./CreateBoardModal";
import styles from "./Sidebar.module.css";

function Sidebar() {
  const { boards, activeBoard, dispatch } = useBoards();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.topSection}>
          <h1
            className={styles.logo}
            onClick={() => dispatch({ type: "setActiveBoard", payload: null })}
          >
            Deploy
          </h1>

          <div className={styles.sectionHeader}>
            <span>My Boards</span>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={styles.addBoardBtn}
            >
              +
            </button>
          </div>
          <nav className={styles.nav}>
            {boards.map((board) => (
              <button
                key={board.id}
                className={`${styles.navItem} ${activeBoard?.id === board.id ? styles.active : ""}`}
                onClick={() =>
                  dispatch({ type: "setActiveBoard", payload: board })
                }
              >
                {board.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Render the modal outside the aside to prevent CSS clipping */}
      {isCreateModalOpen && (
        <CreateBoardModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </>
  );
}

export default Sidebar;
