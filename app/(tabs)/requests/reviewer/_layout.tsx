import React from 'react';
import { Stack } from 'expo-router';

export default function ReviewerStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="submitted" />
    </Stack>
  );
}
