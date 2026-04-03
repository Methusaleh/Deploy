import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL, {
  // Use 'websocket' first to avoid the polling CORS issues entirely
  transports: ["websocket"],
});

export default socket;
