import { useBoards } from "../context/BoardContext";
import styles from "./Sidebar.module.css";

function Sidebar() {
  const { boards, activeBoard, dispatch } = useBoards();

  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the key
    dispatch({ type: "logout" }); // Reset the global state
    window.location.reload(); // Hard refresh to clear everything
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <h1 className={styles.logo}>Deploy</h1>
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

      {/* --- NEW LOGOUT SECTION --- */}
      <div className={styles.bottomSection}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
