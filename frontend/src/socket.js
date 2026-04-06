import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
  autoConnect: false,
  withCredentials: true,
});

export const joinKitchen = (sessionId) => {
  if (!socket.connected) socket.connect();
  socket.emit('join_kitchen', sessionId);
};

export default socket;
