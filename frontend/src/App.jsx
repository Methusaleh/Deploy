import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Drawer from "./components/Drawer";

function App() {
  const { status, selectedCard } = useBoards();

  if (status === "loading")
    return <div className="loading-screen">Loading...</div>;

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
