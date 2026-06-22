import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

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

  if (loading) return <LoadingScreen />;

  return (
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
  );
}
