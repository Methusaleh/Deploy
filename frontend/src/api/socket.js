import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  // Use 'websocket' first to avoid the polling CORS issues entirely
  transports: ["websocket"],
});

export default socket;
