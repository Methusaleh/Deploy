import { Droppable } from "@hello-pangea/dnd";
import Card from "./Card";
import styles from "./Column.module.css";

function Column({ id, title, cards, dispatch }) {
  return (
    <div className={styles.column}>
      <header className={styles.columnHeader}>
        <div className={styles.titleWrapper}>
          <h3 className={styles.columnTitle}>{title}</h3>
          <span className={styles.count}>{cards.length}</span>
        </div>

        <button
          className={styles.addBtn}
          onClick={() => dispatch({ type: "openCreateDrawer", payload: id })}
        >
          +
        </button>
      </header>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`${styles.cardList} ${
              snapshot.isDraggingOver ? styles.draggingOver : ""
            }`}
          >
            {cards.map((card, index) => (
              <Card key={card.id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default Column;
