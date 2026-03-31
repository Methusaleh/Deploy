import { Droppable } from "@hello-pangea/dnd";
import Card from "./Card";
import styles from "./Column.module.css";

function Column({ id, title, cards, dispatch }) {
  return (
    <div className={styles.column}>
      {/* 1. HEADER AREA: Good place for the + button if you want it at the top */}
      <header className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>{title}</h3>
        <button
          className={styles.addBtn}
          onClick={() => dispatch({ type: "openCreateDrawer", payload: id })}
        >
          +
        </button>
      </header>

      {/* 2. DROP ZONE: This is only for the cards and the placeholder */}
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
