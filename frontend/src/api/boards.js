import apiCLient from "./client";

export const getBoards = async () => {
  const token = localStorage.getItem("token"); // Grab your saved token

  const response = await fetch(`${import.meta.env.VITE_API_URL}/boards/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Send the token in the header
    },
  });

  if (!response.ok) {
    // If the token is expired or invalid, the backend returns 401
    throw new Error("Failed to fetch boards");
  }
  return response.json();
};

export const getBoardCards = async (boardId) => {
  const res = await apiCLient.get(`/boards/${boardId}/cards/`);
  return res.data;
};

export const updateCard = async (cardId, cardData) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/cards/${cardId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cardData),
    },
  );
  if (!response.ok) throw new Error("Failed to update card");
  return response.json();
};

export const createCard = async (cardData) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/cards/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) throw new Error("Failed to create card");
  return response.json();
};

export const deleteCard = async (cardId) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/${cardId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete card");
  return response.json();
};
