import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { connectSocket, onMessage } from '../services/socketService';

const UnreadContext = createContext({ unreadCount: 0, clearUnread: () => {} });

export const UnreadProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const myUserId = user?._id ?? user?.id;

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }

    let unsub;
    const setup = async () => {
      await connectSocket();
      unsub = onMessage((msg) => {
        const senderId = msg.sender_id?._id ?? msg.sender_id;
        // Only count messages from others
        if (senderId !== myUserId) {
          setUnreadCount(prev => prev + 1);
        }
      });
    };
    setup();
    return () => { unsub?.(); };
  }, [user, myUserId]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <UnreadContext.Provider value={{ unreadCount, clearUnread }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);
