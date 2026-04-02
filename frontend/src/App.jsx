// frontend/src/App.jsx
import { useState } from "react";
import { useBoards } from "./context/BoardContext";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import Drawer from "./components/Drawer";
import Auth from "./components/Auth";
import UserMenu from "./components/UserMenu";

function App() {
  const { status, boards, selectedCard } = useBoards();

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload(); // Hard refresh to reset the state
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
      <UserMenu onLogout={handleLogout} />
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
