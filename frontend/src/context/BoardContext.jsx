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
  isAuthenticated: !!localStorage.getItem("token"),
  userData: null,
};

export const isUserActive = (lastSeen) => {
  if (!lastSeen) return false;

  const formattedLastSeen = lastSeen.endsWith("Z") ? lastSeen : `${lastSeen}Z`;
  const lastSeenDate = new Date(formattedLastSeen);
  const now = new Date();

  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);

  return diffInSeconds < 60;
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
      return {
        ...state,
        activeBoard: action.payload,
        cards: state.activeBoard?.id === action.payload?.id ? state.cards : [],
      };
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
    case "updateUserPresence":
      if (!state.activeBoard) return state;
      return {
        ...state,
        activeBoard: {
          ...state.activeBoard,
          members: state.activeBoard.members.map((m) =>
            m.id === action.payload.user_id
              ? { ...m, last_seen: action.payload.last_seen }
              : m,
          ),
          owner:
            state.activeBoard.owner?.id === action.payload.user_id
              ? {
                  ...state.activeBoard.owner,
                  last_seen: action.payload.last_seen,
                }
              : state.activeBoard.owner,
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
    if (state.isAuthenticated) {
      async function loadBoards() {
        dispatch({ type: "loading" });
        try {
          const data = await getBoards();
          dispatch({ type: "boardsLoaded", payload: data });
        } catch (err) {
          console.error("Board Load Error:", err);
          dispatch({ type: "error" });
        }
      }
      loadBoards();
    }
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (state.activeBoard?.id) {
      socket.emit("join_board", state.activeBoard.id);
      console.log(`Requested to join room: ${state.activeBoard.id}`);
    }
  }, [state.activeBoard?.id]);

  useEffect(() => {
    if (state.isAuthenticated && state.userData?.id) {
      socket.emit("join_user_room", state.userData.id);
      console.log(
        `Joined private notification room: user_${state.userData.id}`,
      );

      const sendPulse = () => {
        socket.emit("heartbeat", {
          user_id: state.userData.id,
          board_id: state.activeBoard?.id,
        });
        console.log("Heartbeat pulsed");
      };

      sendPulse();
      const heartbeatInterval = setInterval(sendPulse, 30000);

      return () => clearInterval(heartbeatInterval);
    }
  }, [state.isAuthenticated, state.userData?.id, state.activeBoard?.id]);

  useEffect(() => {
    socket.on("card_updated", (updatedCard) => {
      console.log("Real-time update received!", updatedCard);

      if (state.activeBoard && updatedCard.board_id === state.activeBoard.id) {
        const nextCards = state.cards.map((c) =>
          c.id === updatedCard.id ? updatedCard : c,
        );
        dispatch({ type: "setCards", payload: nextCards });
      }
    });

    socket.on("card_deleted", (deletedData) => {
      console.log("Card deleted in real-time!", deletedData);
      const nextCards = state.cards.filter((c) => c.id !== deletedData.id);
      dispatch({ type: "setCards", payload: nextCards });
    });

    socket.on("card_created", (newCard) => {
      console.log("New card created in real-time!", newCard);
      if (state.activeBoard && newCard.board_id === state.activeBoard.id) {
        dispatch({ type: "setCards", payload: [...state.cards, newCard] });
      }
    });

    socket.on("new_notification", (notif) => {
      console.log("New notification received!", notif);
    });

    socket.on("refresh_boards", async () => {
      console.log("Real-time board refresh triggered!");
      try {
        const data = await getBoards();
        dispatch({ type: "boardsLoaded", payload: data });
      } catch (err) {
        console.error("Failed to sync boards:", err);
      }
    });

    socket.on("presence_update", (data) => {
      dispatch({ type: "updateUserPresence", payload: data });
    });

    return () => {
      socket.off("card_updated");
      socket.off("card_deleted");
      socket.off("card_created");
      socket.off("new_notification");
      socket.off("refresh_boards");
      socket.off("presence_update");
    };
  }, [state.activeBoard, state.cards, dispatch]);

  return (
    <BoardContext.Provider value={{ ...state, dispatch, isUserActive }}>
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
