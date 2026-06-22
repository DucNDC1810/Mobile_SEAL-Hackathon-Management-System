import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/client';

let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('accessToken');
  socket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinChatRoom = ({ contestId, roundId, teamId, mentorId }) => {
  socket?.emit('join_chat_room', { contestId, roundId, teamId, mentorId });
};

export const leaveChatRoom = ({ contestId, roundId, teamId, mentorId }) => {
  socket?.emit('leave_chat_room', { contestId, roundId, teamId, mentorId });
};

export const emitTyping = ({ contestId, roundId, teamId, mentorId, isTyping }) => {
  socket?.emit('chat:typing', { contestId, roundId, teamId, mentorId, isTyping });
};

export const onMessage = (callback) => {
  socket?.on('chat:message', callback);
  return () => socket?.off('chat:message', callback);
};

export const onTyping = (callback) => {
  socket?.on('chat:typing', callback);
  return () => socket?.off('chat:typing', callback);
};
