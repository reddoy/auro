import React from 'react';
import { StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

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
      <View style={[styles.card, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }] }>
        <Text style={styles.title}>Thank you for submitting a review! 🎉</Text>
        <Text style={styles.subtitle}>You can optionally post your video to TikTok or Instagram Reels.</Text>

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

        <TouchableOpacity style={[styles.secondaryButton]} onPress={() => router.replace('/(tabs)/requests')}>
          <Text style={[styles.secondaryText]}>Back to Requests</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brand.background },
  card: { flex: 1, paddingHorizontal: 16, justifyContent: 'center' },
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


