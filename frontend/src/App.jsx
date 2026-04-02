// frontend/src/App.jsx
import { useState } from "react";
import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Drawer from "./components/Drawer";
import Auth from "./components/Auth";

function App() {
  const { status, boards, selectedCard } = useBoards();

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  if (status === "loading" && boards.length === 0) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      {/* Added style properties here to:
          1. flex: 1 -> Fill the remaining width next to Sidebar
          2. display: flex -> Allow internal components to layout properly
          3. minWidth: 0 -> Prevent the grid from pushing the sidebar off-screen
      */}
      <main
        className={`board-view ${selectedCard ? "dimmed" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Board />
      </main>
      <Drawer key={selectedCard?.id || "empty"} />
    </div>
  );
}

export default App;
