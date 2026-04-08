/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useReducer, useEffect } from "react";
import { getBoards } from "../api/boards";
import socket from "../api/socket";

const BoardContext = createContext();

const initialState = {
  boards: [],
  activeBoard: null,
  status: "idle", // 'idle' | 'loading' | 'ready' | 'error'
  cards: [],
  selectedCard: null,
  isAuthenticated: !!localStorage.getItem("token"), // Check for token on startup
  userData: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "login":
      return { ...state, isAuthenticated: true, userData: action.payload };
    case "boardsLoaded":
      return { ...state, boards: action.payload, status: "ready" };
    case "setActiveBoard":
      return { ...state, activeBoard: action.payload, cards: [] };
    case "setCards":
      return { ...state, cards: action.payload, status: "ready" };
    case "selectCard":
      return { ...state, selectedCard: action.payload };
    case "closeDrawer":
      return { ...state, selectedCard: null };
    case "openCreateDrawer":
      return {
        ...state,
        selectedCard: {
          id: "new",
          status: action.payload,
          title: "",
          description: "",
        },
      };
    case "logout":
      return {
        ...initialState,
        isAuthenticated: false,
      };
    case "error":
      return { ...state, status: "error" };
    default:
      throw new Error("Unknown action type");
  }
}

function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Only fetch if we are actually logged in
    if (state.isAuthenticated && state.userData?.id) {
      async function loadBoards() {
        dispatch({ type: "loading" });
        try {
          const data = await getBoards();
          dispatch({ type: "boardsLoaded", payload: data });
        } catch {
          dispatch({ type: "error" });
        }
      }
      loadBoards();
    }
  }, [state.isAuthenticated, state.userData?.id]); // This trigger is the magic part

  // --- EFFECT 2: Join a Socket.IO Room when the board changes ---
  useEffect(() => {
    if (state.activeBoard?.id) {
      socket.emit("join_board", state.activeBoard.id);
      console.log(`Requested to join room: ${state.activeBoard.id}`);
    }
  }, [state.activeBoard?.id]); // Runs every time the ID changes

  // --- EFFECT: Join Private User Room for Notifications ---
  useEffect(() => {
    // We need the user ID to join the correct room
    if (state.isAuthenticated && state.userData?.id) {
      socket.emit("join_user_room", state.userData.id);
      console.log(
        `Joined private notification room: user_${state.userData.id}`,
      );
    }
  }, [state.isAuthenticated, state.userData?.id]);

  useEffect(() => {
    // --- 1. UPDATE LISTENER ---
    socket.on("card_updated", (updatedCard) => {
      console.log("Real-time update received!", updatedCard);

      if (state.activeBoard && updatedCard.board_id === state.activeBoard.id) {
        const nextCards = state.cards.map((c) =>
          c.id === updatedCard.id ? updatedCard : c,
        );
        dispatch({ type: "setCards", payload: nextCards });
      }
    });

    // --- 2. DELETE LISTENER ---
    socket.on("card_deleted", (deletedData) => {
      console.log("Card deleted in real-time!", deletedData);

      // We don't need a board_id check here if the ID is unique,
      // but it doesn't hurt to keep things scoped.
      const nextCards = state.cards.filter((c) => c.id !== deletedData.id);
      dispatch({ type: "setCards", payload: nextCards });
    });

    // 3. NEW: Listen for Creations
    socket.on("card_created", (newCard) => {
      console.log("New card created in real-time!", newCard);
      if (state.activeBoard && newCard.board_id === state.activeBoard.id) {
        // Add the new card to our current list
        dispatch({ type: "setCards", payload: [...state.cards, newCard] });
      }
    });

    // 4. NEW: Listen for Invitations/Notifications
    socket.on("new_notification", (notif) => {
      console.log("New notification received!", notif);
      // Here you can trigger a dispatch to update an 'unread' count
      // or just let the UserMenu fetch the latest list.
      // dispatch({ type: "addNotification", payload: notif });
    });

    // --- 4. CLEANUP (Runs when component unmounts or dependencies change) ---
    return () => {
      socket.off("card_updated");
      socket.off("card_deleted");
      socket.off("card_created");
      socket.off("new_notification");
    };
  }, [state.activeBoard, state.cards, dispatch]);

  return (
    <BoardContext.Provider value={{ ...state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
}

function useBoards() {
  const context = useContext(BoardContext);
  if (context === undefined)
    throw new Error("useBoards used outside of Provider");
  return context;
}

export { BoardProvider, useBoards };
