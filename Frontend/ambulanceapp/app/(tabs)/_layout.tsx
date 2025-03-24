import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: 'white', height: 60 },
        tabBarActiveTintColor: '#1E3A8A', 
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#1E3A8A' }, 
        headerTitleStyle: { color: 'white' },
        headerTitleAlign: 'left',
        headerTitle: () => (
          <Text style={{ color: 'white', fontSize: 23, fontWeight: 'bold', marginLeft: 10 }}>
            GoldenPulse
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <MaterialIcons name="notifications" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hoschoose"
        options={{
          title: 'Hospitals',
          tabBarIcon: ({ color }) => <MaterialIcons name="local-hospital" size={28} color={color} />,
         
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <MaterialIcons name="assignment" size={28} color={color} />,
        }}
      />
      
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
