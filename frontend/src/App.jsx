import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Drawer from "./components/Drawer";

function App() {
  const { status, boards, selectedCard } = useBoards();

  if (status === "loading" && boards.length === 0) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className={`board-view ${selectedCard ? "dimmed" : ""}`}>
        <Board />
      </main>
      <Drawer />
    </div>
  );
}

export default App;
