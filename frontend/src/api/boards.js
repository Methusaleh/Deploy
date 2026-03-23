import apiCLient from "./client";

export const getBoards = async (userId) => {
  const res = await apiCLient.get(`/users/${userId}/boards/`);
  return res.data;
};

export const getBoardCards = async (boardId) => {
  const res = await apiCLient.get(`/boards/${boardId}/cards/`);
  return res.data;
};

export const updateCard = async (cardId, cardData) => {
  const response = await fetch(`http://localhost:8000/cards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) throw new Error("Failed to update card");
  return response.json();
};

export const createCard = async (cardData) => {
  const response = await fetch(`http://localhost:8000/cards/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) throw new Error("Failed to create card");
  return response.json();
};

export const deleteCard = async (cardId) => {
  const response = await fetch(`http://localhost:8000/cards/${cardId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete card");
  return response.json();
};
