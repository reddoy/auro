import React from 'react';
import { Stack } from 'expo-router';

export default function RequestsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="new" />
      <Stack.Screen name="reviewer/[id]" />
      <Stack.Screen name="reviewer/index" />
      <Stack.Screen name="reviewer/profile" />
      <Stack.Screen name="reviewer/submitted" />
    </Stack>
  );
}


