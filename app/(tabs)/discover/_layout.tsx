import React from 'react';
import { Stack } from 'expo-router';

export default function DiscoverStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="influencer/[id]" />
    </Stack>
  );
}


