import React from 'react';
import { StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import * as Sharing from 'expo-sharing';

export default function ReviewSubmittedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ uri?: string }>();
  const mediaUri = (params?.uri as string) || '';

  const openTikTok = async () => {
    try {
      if (mediaUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(mediaUri);
        return;
      }
      // Try TikTok camera or app
      const tiktokUrl = Platform.select({ ios: 'musically://camera', android: 'snssdk1128://openRecord' });
      if (tiktokUrl) {
        const supported = await Linking.canOpenURL(tiktokUrl);
        if (supported) {
          await Linking.openURL(tiktokUrl);
          return;
        }
      }
    } catch {}
    // Fallback to TikTok website
    Linking.openURL('https://www.tiktok.com/upload');
  };

  const openInstagramReels = async () => {
    try {
      if (mediaUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(mediaUri);
        return;
      }
      const igUrl = Platform.select({ ios: 'instagram://camera', android: 'instagram://camera' });
      if (igUrl && (await Linking.canOpenURL(igUrl))) {
        await Linking.openURL(igUrl);
        return;
      }
    } catch {}
    Linking.openURL('https://www.instagram.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button in top left */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 12 }]} 
        onPress={() => router.replace('/(tabs)/profile')}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.brand.textPrimary} />
      </TouchableOpacity>

      <View style={[styles.card, { paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 24 }] }>
        <Text style={styles.title}>Thank you for submitting your review!</Text>
        <Text style={styles.subtitle}>You can post straight to TikTok or IG</Text>

        {!!mediaUri && (
          <Text style={styles.hint}>Attached media ready: {mediaUri.split('/').pop()}</Text>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.button, styles.tiktok]} onPress={openTikTok}>
            <Text style={styles.buttonText}>Post to TikTok</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.instagram]} onPress={openInstagramReels}>
            <Text style={styles.buttonText}>Post to Instagram Reels</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  card: { flex: 1, paddingHorizontal: 16, justifyContent: 'center' },
  backButton: { 
    position: 'absolute', 
    left: 16, 
    zIndex: 10, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: Colors.brand.cardBackground, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  title: { fontSize: 24, fontWeight: '900', color: Colors.brand.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 20 },
  hint: { fontSize: 12, color: Colors.brand.textSecondary, textAlign: 'center', marginBottom: 14 },
  buttons: { gap: 12 },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  tiktok: { backgroundColor: '#000000' },
  instagram: { backgroundColor: '#E1306C' },
  buttonText: { color: Colors.brand.textOnGradient, fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 18, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.brand.border },
  secondaryText: { color: Colors.brand.textPrimary, fontSize: 15, fontWeight: '700' },
});


