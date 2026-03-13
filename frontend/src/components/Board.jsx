import { useEffect } from "react";
import { useBoards } from "../context/BoardContext";
import { getBoardCards } from "../api/boards";
import styles from "./Board.module.css";

function Board() {
  const { activeBoard, cards, status, dispatch } = useBoards();

  const { id } = activeBoard || {};

  const COLUMNS = [
    { id: "backlog", title: "Backlog" },
    { id: "design", title: "Design" },
    { id: "development", title: "Development" },
    { id: "testing", title: "Testing" },
    { id: "deploy", title: "Deploy" },
  ];

  useEffect(
    function () {
      if (!id) return;
      async function fetchCards() {
        try {
          dispatch({ type: "loading" });
          const data = await getBoardCards(id);
          dispatch({ type: "setCards", payload: data });
        } catch (err) {
          dispatch({ type: "error", payload: err.message });
        }
      }

      fetchCards();
    },
    [id, dispatch],
  );

  if (!activeBoard) {
    return (
      <section className={styles.empty}>
        <p>Select a board from the sidebar to get started</p>
      </section>
    );
  }

  if (status === "loading" && cards.length === 0) {
    return <p className={styles.message}>Loading cards...</p>;
  }

  return (
    <div className={styles.boardContainer}>
      <header className={styles.header}>
        <h1>{activeBoard.title}</h1>
      </header>

      <div className={styles.grid}>
        {COLUMNS.map((column) => {
          const columnCards = cards.filter((card) => card.status === column.id);

          return (
            <Column key={column.id} title={column.title} cards={columnCards} />
          );
        })}
        <p>Cards found: {cards.length}</p>
      </div>
    </div>
  );
}

export default Board;
