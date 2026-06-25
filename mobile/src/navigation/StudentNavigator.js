import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useUnread } from '../contexts/UnreadContext';

import StudentHomeScreen    from '../screens/student/StudentHomeScreen';
import TeamInfoScreen       from '../screens/student/TeamInfoScreen';
import ConversationsScreen  from '../screens/chat/ConversationsScreen';
import ChatScreen           from '../screens/chat/ChatScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Chat"          component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function StudentNavigator() {
  const { unreadCount, clearUnread } = useUnread();

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
        tabBarActiveTintColor:   colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:    focused ? 'home'         : 'home-outline',
            Team:    focused ? 'people'       : 'people-outline',
            Chat:    focused ? 'chatbubbles'  : 'chatbubbles-outline',
            Profile: focused ? 'person'       : 'person-outline',
          };
          const showBadge = route.name === 'Chat' && unreadCount > 0;
          return (
            <View>
              <Ionicons name={icons[route.name]} size={22} color={color} />
              {showBadge && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#EF4444', borderRadius: 8,
                  minWidth: 16, height: 16,
                  justifyContent: 'center', alignItems: 'center',
                  paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"    component={StudentHomeScreen}    options={{ tabBarLabel: 'Tổng quan' }} />
      <Tab.Screen name="Team"    component={TeamInfoScreen}        options={{ tabBarLabel: 'Đội của tôi' }} />
      <Tab.Screen name="Chat"    component={ChatStack}
        listeners={{ tabPress: () => clearUnread() }}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen name="Profile" component={StudentProfileScreen}  options={{ tabBarLabel: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}
