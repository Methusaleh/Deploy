import apiCLient from "./client";

export const getBoards = async (userId) => {
  const res = await apiCLient.get(`/users/${userId}/boards/`);
  return res.data;
};

export const getBoardCards = async (boardId) => {
  const res = await apiCLient.get(`/boards/${boardId}/cards/`);
  return res.data;
};
