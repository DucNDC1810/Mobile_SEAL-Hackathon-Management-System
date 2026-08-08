import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/client';

let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('accessToken');
  socket = io(BASE_URL, {
    // Cho phép fallback polling trước rồi upgrade — websocket-only dễ fail
    // khi Render (free tier) vừa cold-start và chưa sẵn sàng nâng cấp giao thức.
    transports: ['polling', 'websocket'],
    auth: { token },
    // Render free tier có thể mất 30-60s để tỉnh dậy sau khi "ngủ" do idle —
    // timeout mặc định (20s) và retry ngắn dễ bỏ cuộc giữa chừng cold-start.
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
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
  socket.on('reconnect_attempt', (attempt) => {
    console.log('[Socket] Reconnect attempt', attempt);
  });
  socket.on('reconnect_failed', () => {
    console.warn('[Socket] Reconnect failed — giving up after max attempts');
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
