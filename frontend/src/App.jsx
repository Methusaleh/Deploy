import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";

function App() {
  const { activeBoard, status } = useBoards();

  if (status === "loading") return <div>Loading...</div>;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="board-view">
        {activeBoard ? (
          <h1>{activeBoard.title}</h1>
        ) : (
          <h1>Select a board to start</h1>
        )}
        {/*Board Component will go here*/}
      </main>
    </div>
  );
}

export default App;
