// frontend/src/api/boards.js
import apiClient from "./client"; // Notice I fixed the typo (apiCLient -> apiClient)

export const getBoards = async () => {
  const res = await apiClient.get("/boards/me");
  return res.data;
};

export const getBoardCards = async (boardId) => {
  const res = await apiClient.get(`/boards/${boardId}/cards/`);
  return res.data;
};

export const updateCard = async (cardId, cardData) => {
  const res = await apiClient.put(`/cards/${cardId}`, cardData);
  return res.data;
};

export const createCard = async (cardData) => {
  const res = await apiClient.post("/cards/", cardData);
  return res.data;
};

export const deleteCard = async (cardId) => {
  const res = await apiClient.delete(`/cards/${cardId}`);
  return res.data;
};

// --- NEW FUNCTION: Create a Board ---
export const createBoard = async (title) => {
  const res = await apiClient.post("/boards/", { title });
  return res.data;
};
