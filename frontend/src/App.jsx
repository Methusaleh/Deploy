// frontend/src/App.jsx
import { useState } from "react";
import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Drawer from "./components/Drawer";
import Auth from "./components/Auth"; // Import your new component

function App() {
  const { status, boards, selectedCard } = useBoards();
  // Check localStorage for an existing token [cite: 258]
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // If not logged in, show ONLY the Auth component
  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  if (status === "loading" && boards.length === 0) {
    return <div className="loading-screen">Loading...</div>; // [cite: 232]
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className={`board-view ${selectedCard ? "dimmed" : ""}`}>
        <Board />
      </main>
      <Drawer key={selectedCard?.id || "empty"} />
    </div>
  );
}

export default App;
