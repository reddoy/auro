import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="reviewer-settings" options={{ headerShown: true, title: 'Reviewer Settings' }} />
      <Stack.Screen name="video-review-demo" options={{ headerShown: false }} />
    </Stack>
  );
}


