export const getMyGlobalCards = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${import.meta.env.VITE_API_URL}/cards/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch global cards");
  }
  return response.json();
};
