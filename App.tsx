import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7EF' }}>
      <StatusBar style="dark" />
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>🐾 GRRR Care</Text>
      <Text style={{ fontSize: 16, color: '#666' }}>Pet Health Assistant</Text>
      <Text style={{ fontSize: 12, color: '#999', marginTop: 20 }}>Coming Soon!</Text>
    </View>
  );
}
