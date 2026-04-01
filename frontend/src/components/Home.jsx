// frontend/src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { getMyGlobalCards } from "../api/cards";
import styles from "./Home.module.css";

const Home = () => {
  const [globalCards, setGlobalCards] = useState([]);
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

  if (loading)
    return <div className={styles.loading}>Analyzing your workspace...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Welcome back, Aaron</h1>
        <p>Here’s what’s happening across your projects.</p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Tasks</span>
          <span className={styles.statValue}>{globalCards.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Stale Tasks</span>
          <span className={styles.statValue}>--</span>{" "}
          {/* We'll calculate this tomorrow */}
        </div>
      </section>

      <div className={styles.content}>
        <div className={styles.feedSection}>
          <h2>Global Feed</h2>
          {globalCards.map((card) => (
            <div key={card.id} className={styles.miniCard}>
              <span
                className={styles.priorityDot}
                data-priority={card.priority}
              ></span>
              <div className={styles.cardInfo}>
                <span className={styles.cardTitle}>{card.title}</span>
                <span className={styles.cardMeta}>
                  Board ID: {card.board_id} • {card.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
