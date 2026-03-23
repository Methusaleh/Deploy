import Card from "./Card";
import styles from "./Column.module.css";

function Column({ id, title, cards, dispatch }) {
  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>
          {title} <span className={styles.count}>{cards.length}</span>
        </h3>
        <button
          className={styles.addBtn}
          onClick={() => dispatch({ type: "openCreateDrawer", payload: id })}
        >
          +
        </button>
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
