import { useBoards } from "./context/BoardContext";

function App() {
  const { boards, status } = useBoards();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>My Kanban Boards</h1>

      {status === "loading" && <p>Loading boards from Neon...</p>}
      {status === "error" && (
        <p>Error connecting to backend. Is FastAPI running?</p>
      )}

      {status === "ready" && (
        <ul>
          {boards.map((board) => (
            <li key={board.id} style={{ fontSize: "1.2rem", margin: "10px 0" }}>
              <strong>{board.title}</strong> (ID: {board.id})
            </li>
          ))}
        </ul>
      )}

      {status === "ready" && boards.length === 0 && (
        <p>No boards found. Go to Swagger to create one!</p>
      )}
    </div>
  );
}

export default App;
