// frontend/src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { getMyGlobalCards } from "../api/cards";
import { useBoards } from "../context/BoardContext";
import styles from "./Home.module.css";

const Home = () => {
  const [globalCards, setGlobalCards] = useState([]);
  const { boards, dispatch } = useBoards();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const data = await getMyGlobalCards();
        setGlobalCards(data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, []);

  // --- WIDGET LOGIC ---

  // 1. Urgent Widget: Top 5 High Priority (Excluding completed cards)
  const urgentTasks = globalCards
    .filter((c) => {
      const isHigh = c.priority?.toLowerCase() === "high";
      const status = c.status?.toLowerCase() || "";
      const isNotDone =
        status !== "done" && status !== "deploy" && status !== "completed";
      return isHigh && isNotDone;
    })
    .slice(0, 5);

  // 2. Recent Widget: Last 5 items moved
  const recentTasks = [...globalCards]
    .sort((a, b) => new Date(b.last_moved_at) - new Date(a.last_moved_at))
    .slice(0, 5);

  // 3. Global Stats: Count all completed cards across all boards
  const completedTasksCount = globalCards.filter((c) => {
    const status = c.status?.toLowerCase() || "";
    return status === "done" || status === "deploy" || status === "completed";
  }).length;

  // 4. Project Health: Progress bars per board
  const boardHealth = boards.map((board) => {
    const boardCards = globalCards.filter((c) => c.board_id === board.id);

    const completed = boardCards.filter((c) => {
      const status = c.status?.toLowerCase() || "";
      return status === "done" || status === "deploy" || status === "completed";
    }).length;

    const progress =
      boardCards.length > 0
        ? Math.round((completed / boardCards.length) * 100)
        : 0;

    return { ...board, progress, total: boardCards.length };
  });

  // --- NEW WIDGET LOGIC ---

  // 5. Shortcuts: Just the top 4 boards for quick access
  const boardShortcuts = boards.slice(0, 4);

  if (loading)
    return (
      <div className={styles.loading}>Initializing Mission Control...</div>
    );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <span className={styles.pulse}></span>
            Mission Control
          </h1>
          <p className={styles.dateDisplay}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* RE-STYLED STATS ROW */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard} data-type="total">
          <div className={styles.statIcon}>Σ</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{globalCards.length}</span>
            <span className={styles.statLabel}>Total Tasks</span>
          </div>
        </div>

        <div className={styles.statCard} data-type="completed">
          <div className={styles.statIcon}>✓</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{completedTasksCount}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <div className={styles.bentoGrid}>
        {/* WIDGET 1: URGENT */}
        <div className={styles.widget}>
          <h3>Urgent (High Priority)</h3>
          <div className={styles.widgetContent}>
            {urgentTasks.map((task) => (
              <div
                key={task.id}
                className={styles.miniCard}
                onClick={() =>
                  dispatch({
                    type: "setActiveBoard",
                    payload: boards.find((b) => b.id === task.board_id),
                  })
                }
              >
                <span
                  className={styles.priorityDot}
                  data-priority="high"
                ></span>
                <p>{task.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET 2: RECENT ACTIVITY */}
        <div className={styles.widget}>
          <h3>Recent Activity</h3>
          <div className={styles.widgetContent}>
            {recentTasks.map((task) => {
              const boardObj = boards?.find((b) => b.id === task.board_id);
              return (
                <div
                  key={task.id}
                  className={styles.miniCard}
                  onClick={() =>
                    boardObj &&
                    dispatch({ type: "setActiveBoard", payload: boardObj })
                  }
                >
                  <div className={styles.cardInfo}>
                    <p className={styles.cardTitle}>{task.title}</p>
                    <p className={styles.cardMeta}>
                      Moved to{" "}
                      <span className={styles.statusPill}>{task.status}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* WIDGET 3: PROJECT HEALTH */}
        <div className={styles.widget}>
          <h3>Project Health</h3>
          <div className={styles.widgetContent}>
            {boardHealth.map((project) => (
              <div key={project.id} className={styles.healthRow}>
                <div className={styles.healthInfo}>
                  <span>{project.title}</span>
                  <span>{project.progress}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET 4: BOARD SHORTCUTS (The Gap Filler) */}
        <div className={styles.widget}>
          <h3>Quick Links</h3>
          <div className={styles.shortcutGrid}>
            {boardShortcuts.map((board) => (
              <button
                key={board.id}
                className={styles.shortcutBtn}
                onClick={() =>
                  dispatch({ type: "setActiveBoard", payload: board })
                }
              >
                {board.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
