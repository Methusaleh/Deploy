import Card from "./Card";
import styles from "./Column.module.css";

function Column({ title, cards }) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{cards.length}</span>
      </div>

      <div className={styles.cardList}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

export default Column;
