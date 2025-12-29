import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

type Props = {
  onNext: () => void;
};

export default function IntroStep({ onNext }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a Review</Text>
      <Text style={styles.description}>
        Get personalized feedback from our expert reviewers
      </Text>
      <TouchableOpacity style={styles.button} onPress={onNext}>
        <ExpoLinearGradient
          colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
});
