import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#18181b',
          borderTopWidth: 1,
          ...Platform.select({
            ios: {
              height: 94,
              paddingBottom: 28,
            },
            android: {
              height: 72,
              paddingBottom: 12,
            },
            default: {
              height: 70,
              paddingBottom: 8,
            },
          }),
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? {
              borderColor: '#ffffff',
              borderWidth: 1.5,
              borderRadius: 8,
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
            } : {
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'transparent',
              borderWidth: 1.5,
            }}>
              <Ionicons name="notifications" size={20} color={focused ? '#6366f1' : '#71717a'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? {
              borderColor: '#ffffff',
              borderWidth: 1.5,
              borderRadius: 8,
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
            } : {
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'transparent',
              borderWidth: 1.5,
            }}>
              <Ionicons name="search" size={20} color={focused ? '#6366f1' : '#71717a'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? {
              borderColor: '#ffffff',
              borderWidth: 1.5,
              borderRadius: 8,
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
            } : {
              paddingHorizontal: 22,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: 'transparent',
              borderWidth: 1.5,
            }}>
              <Ionicons name="bookmark" size={20} color={focused ? '#6366f1' : '#71717a'} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}