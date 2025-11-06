import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isCompact = screenHeight <= 900;
  
  // Load the video
  const videoPlayer = useVideoPlayer(require('../katie_demo.mov'), (player) => {
    player.loop = true;
    player.play();
  });

  const handleGetStarted = () => {
    router.replace('/auth');
  };

  const buttonBorderRadius = isCompact ? 22 : 24;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Logo and Brand Name */}
      <View style={[styles.logoContainer, { paddingTop: insets.top + 20 }]}>
        <Image 
          source={require('../auro_aura_logo_nobg.png')} 
          style={[styles.logoImage, isCompact && styles.logoImageCompact]}
          resizeMode="contain"
        />
        <Text style={[styles.brandText, isCompact && styles.brandTextCompact]}>Auro</Text>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        <View style={styles.videoWrapper}>
          <VideoView
            style={styles.video}
            player={videoPlayer}
            contentFit="cover"
            nativeControls={true}
            allowsFullscreen={true}
          />
        </View>
      </View>

      {/* Tagline Text */}
      <View style={styles.taglineContainer}>
        <Text style={[styles.taglineText, isCompact && styles.taglineTextCompact]}>
          Real women, Real reviews, More matches
        </Text>
      </View>

      {/* Get Started Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.getStartedButton, isCompact && styles.getStartedButtonCompact]}
          onPress={handleGetStarted}
        >
          <ExpoLinearGradient
            colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: buttonBorderRadius }}
          />
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  logoImageCompact: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
  },
  brandTextCompact: {
    fontSize: 28,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  videoWrapper: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 3 / 4, // Cropped aspect ratio (wider than 9:16, crops top and sides)
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  taglineContainer: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  taglineText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  taglineTextCompact: {
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 28,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  getStartedButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: Colors.brand.accentMagenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  getStartedButtonCompact: {
    paddingVertical: 14,
    borderRadius: 22,
  },
  getStartedButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
  },
});

