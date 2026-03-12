import { createContext, useContext, useReducer, useEffect } from "react";
import { getBoards } from "../api/boards";

const BoardContext = createContext();

const initialState = {
  boards: [],
  activeBoard: null,
  status: "idle", // 'idle' | 'loading' | 'ready' | 'error'
};

function reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "boardsLoaded":
      return { ...state, boards: action.payload, status: "ready" };
    case "setActiveBoard":
      return { ...state, activeBoard: action.payload };
    case "error":
      return { ...state, status: "error" };
    default:
      throw new Error("Unknown action type");
  }
}

function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load boards on startup
  useEffect(() => {
    async function loadBoards() {
      dispatch({ type: "loading" });
      try {
        // For now, we'll hardcode User ID 1 (Aaron) until we build Auth
        const data = await getBoards(1);
        dispatch({ type: "boardsLoaded", payload: data });
      } catch {
        dispatch({ type: "error" });
      }
    }
    loadBoards();
  }, []);

  return (
    <BoardContext.Provider value={{ ...state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
}

// Custom hook (the Jonas way!)
function useBoards() {
  const context = useContext(BoardContext);
  if (context === undefined)
    throw new Error("useBoards used outside of Provider");
  return context;
}

export { BoardProvider, useBoards };
