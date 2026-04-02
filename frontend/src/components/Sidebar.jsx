import { useBoards } from "../context/BoardContext";
import styles from "./Sidebar.module.css";

function Sidebar() {
  const { boards, activeBoard, dispatch } = useBoards();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <h1
          className={styles.logo}
          onClick={() => dispatch({ type: "setActiveBoard", payload: null })}
        >
          Deploy
        </h1>

        <div className={styles.sectionHeader}>My Boards</div>
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
  );
}

export default Sidebar;
