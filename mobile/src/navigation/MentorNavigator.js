import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import MentorHomeScreen    from '../screens/mentor/MentorHomeScreen';
import AssignedTeamsScreen from '../screens/mentor/AssignedTeamsScreen';
import TeamDetailScreen    from '../screens/mentor/TeamDetailScreen';
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import ChatScreen          from '../screens/chat/ChatScreen';
import MentorProfileScreen from '../screens/mentor/MentorProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TeamsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssignedTeams" component={AssignedTeamsScreen} />
      <Stack.Screen name="TeamDetail"    component={TeamDetailScreen} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Chat"          component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function MentorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.brand.secondary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:    focused ? 'grid'        : 'grid-outline',
            Teams:   focused ? 'people'      : 'people-outline',
            Chat:    focused ? 'chatbubbles' : 'chatbubbles-outline',
            Profile: focused ? 'person'      : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={MentorHomeScreen}    options={{ tabBarLabel: 'Tổng quan' }} />
      <Tab.Screen name="Teams"   component={TeamsStack}           options={{ tabBarLabel: 'Nhóm của tôi' }} />
      <Tab.Screen name="Chat"    component={ChatStack}            options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Profile" component={MentorProfileScreen}  options={{ tabBarLabel: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}
