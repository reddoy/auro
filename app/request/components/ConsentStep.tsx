import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';
import Colors from '@/constants/Colors';
import type { RequestData } from '../index';

type Props = {
  requestData: RequestData;
  onConsentChange: (consent: RequestData['consent']) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function ConsentStep({ requestData, onConsentChange, onNext, onBack }: Props) {
  const [shareOnSocial, setShareOnSocial] = useState(requestData.consent.shareOnSocial || false);

  const handleNext = () => {
    onConsentChange({
      shareOnSocial,
      agreedAt: new Date().toISOString(),
    });
    onNext();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Terms & Consent</Text>
      
      <View style={styles.consentCard}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            I consent to share my review on social media
          </Text>
          <Switch
            value={shareOnSocial}
            onValueChange={setShareOnSocial}
            trackColor={{ false: Colors.brand.border, true: Colors.brand.accentOrange }}
            thumbColor={Colors.brand.textOnGradient}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 24,
  },
  consentCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  button: {
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
});
