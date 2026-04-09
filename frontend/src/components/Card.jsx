import { Draggable } from "@hello-pangea/dnd";
import { useBoards } from "../context/BoardContext";
import UserAvatar from "./UserAvatar";
import styles from "./Card.module.css";

function Card({ card, index }) {
  const { dispatch, activeBoard } = useBoards();

  // Normalize priority for the CSS class (defaults to 'low')
  const priorityClass = card.priority?.toLowerCase() || "low";
  const assignee = activeBoard?.members?.find((m) => m.id === card.assigned_to);

  return (
    <Draggable draggableId={card.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          /* We add a 'dragging' class so we can style the card while it's being moved */
          className={`${styles.card} ${styles[priorityClass]} ${
            snapshot.isDragging ? styles.dragging : ""
          }`}
          onClick={() => dispatch({ type: "selectCard", payload: card })}
        >
          {/* The vertical color accent */}
          <div className={styles.priorityBar}></div>

          <div className={styles.content}>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            {card.description && (
              <p className={styles.description}>{card.description}</p>
            )}

            <div className={styles.cardFooter}>
              <div className={styles.metaInfo}>
                {card.due_date && (
                  <span className={styles.dateBadge}>
                    <span className="material-icons">event</span>
                    {new Date(card.due_date).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              {assignee && (
                <div className={styles.assigneeAvatar}>
                  <UserAvatar
                    name={`${assignee.first_name} ${assignee.last_name}`}
                    size={22}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default Card;
