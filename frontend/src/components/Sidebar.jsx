import { useBoards } from "../context/BoardContext";
import styles from "./Sidebar.module.css";

function Sidebar() {
  const { boards, activeBoard, dispatch } = useBoards();

  return (
    <aside className={styles.sidebar}>
      <h2>My Boards</h2>
      <ul>
        {boards.map((board) => (
          <li
            key={board.id}
            className={`${styles.li} ${activeBoard?.id === board.id ? styles.active : ""}`}
            onClick={() => dispatch({ type: "setActiveBoard", payload: board })}
          >
            {board.title}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
