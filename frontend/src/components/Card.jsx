import styles from "./Card.module.css";

function Card({ card, dispatch }) {
  const priorityStyle = styles[card.priority?.toLowerCase()] || styles.low;
  return (
    <div
      className={styles.card}
      onClick={() => dispatch({ type: "selectCard", payload: card })}
    >
      <div className={styles.content}>
        <h3 className={styles.cardTitle}>{card.title}</h3>
        {card.description && (
          <p className={styles.description}>{card.description}</p>
        )}
      </div>

      <div className={styles.footer}>
        {/* Neon accent indicator for priority */}
        <span className={`${styles.badge} ${priorityStyle}`}>
          {card.priority || "Low"}
        </span>
      </div>
    </div>
  );
}

export default Card;
