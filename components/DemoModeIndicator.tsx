import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function DemoModeIndicator() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <Ionicons name="information-circle" size={16} color={Colors.brand.accentMagenta} />
        <Text style={styles.text}>Demo Mode - All features available for testing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.brand.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.accentMagenta + '40',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.accentMagenta + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  text: {
    color: Colors.brand.accentMagenta,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Poppins_600SemiBold',
  },
});



