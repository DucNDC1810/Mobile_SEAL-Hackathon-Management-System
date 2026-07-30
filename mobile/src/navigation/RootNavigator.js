import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { UnreadProvider } from '../contexts/UnreadContext';
import { View, ActivityIndicator, AppState } from 'react-native';
import { colors } from '../theme';
import { requestNotificationPermission, showMessageNotification } from '../services/notificationService';
import { connectSocket, disconnectSocket, onMessage } from '../services/socketService';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';

// Student navigator
import StudentNavigator from './StudentNavigator';

// Mentor navigator
import MentorNavigator from './MentorNavigator';

// Chat screen (shared, used within navigators)
import ChatScreen from '../screens/chat/ChatScreen';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={colors.brand.primary} />
  </View>
);

export default function RootNavigator() {
  const { user, loading, isStudent, isMentor, isAdmin } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;
    requestNotificationPermission();

    // Connect socket globally and listen for messages when app is backgrounded
    connectSocket();
    const unsub = onMessage((msg) => {
      // Only show notification if app is in background/inactive
      if (appState.current !== 'active') {
        const senderName = msg.sender_id?.full_name ?? 'Tin nhắn mới';
        showMessageNotification({
          senderName,
          content: msg.content,
          contestTitle: '',
        });
      }
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      appState.current = next;
    });

    return () => {
      unsub?.();
      appStateSub.remove();
    };
  }, [user]);

  if (loading) return <LoadingScreen />;

  return (
    <UnreadProvider>
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.brand.primary,
          background: colors.bg.primary,
          card: colors.bg.secondary,
          text: colors.text.primary,
          border: colors.border.default,
          notification: colors.brand.primary,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not logged in
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (isStudent || (!isMentor && !isAdmin)) ? (
          // Student flow
          <Stack.Screen name="StudentMain" component={StudentNavigator} />
        ) : (
          // Mentor / Admin flow
          <Stack.Screen name="MentorMain" component={MentorNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </UnreadProvider>
  );
}
