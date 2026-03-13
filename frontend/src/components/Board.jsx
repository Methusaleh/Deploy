import { useEffect } from "react";
import { useBoards } from "../context/BoardContext";
import { getBoardCards } from "../api/boards";
import styles from "./Board.module.css";

function Board() {
  const { activeBoard, cards, status, dispatch } = useBoards();

  const { id } = activeBoard || {};

  useEffect(
    function () {
      if (!activeBoard) return;
      async function fetchCards() {
        try {
          dispatch({ type: "loading" });
          const data = await getBoardCards(activeBoard.id);
          dispatch({ type: "setCards", payload: data });
        } catch (err) {
          dispatch({ type: "error", payload: err.message });
        }
      }

      fetchCards();
    },
    [activeBoard?.id, dispatch],
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
        {/* {cards.map((card) => ( */}
        <p>Cards found: {cards.length}</p>
      </div>
    </div>
  );
}

export default Board;
