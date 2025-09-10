import React, { useEffect, useState } from 'react';
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  View as RNView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function TwoFactorSetupScreen() {
  const [loading, setLoading] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [hasSMS2FA, setHasSMS2FA] = useState(false);

  useEffect(() => {
    // SMS 2FA disabled: skip status check
    setLoading(false);
  }, []);

  // SMS 2FA disabled: no-op
  const checkSMS2FAStatus = async () => {};

  const sendVerificationCode = async () => {
    Alert.alert('Unavailable', 'SMS two-factor authentication is currently disabled.');
  };

  const verifyAndEnable = async () => {
    Alert.alert('Unavailable', 'SMS two-factor authentication is currently disabled.');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.brand.accentMagenta} />
        <Text style={styles.loadingText}>Checking two-factor authentication status...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Enable SMS Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Secure your account with SMS verification codes
        </Text>

        {!showVerification ? (
          <View style={styles.setupContainer}>
            <Text style={styles.instruction}>
              We'll send verification codes to your phone number when you log in or need to verify your identity.
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+1234567890"
                keyboardType="phone-pad"
                autoFocus
                placeholderTextColor={Colors.brand.textSecondary}
              />
              <Text style={styles.inputHint}>
                Include country code (e.g., +1 for US)
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.buttonDisabled]} 
              onPress={sendVerificationCode}
              disabled
            >
              {sendingCode ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.verificationContainer}>
            <Text style={styles.stepTitle}>Verify Your Phone Number</Text>
            <Text style={styles.stepInstruction}>
              Enter the 6-digit code we sent to {phoneNumber}:
            </Text>
            
            <TextInput
              style={styles.codeInput}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
              autoFocus
              placeholderTextColor={Colors.brand.textSecondary}
            />

            <TouchableOpacity 
              style={[styles.button, styles.buttonDisabled]} 
              onPress={verifyAndEnable}
              disabled
            >
              {verifyingCode ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Enable</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={sendVerificationCode}
              disabled
            >
              <Text style={styles.resendButtonText}>
                {sendingCode ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 28,
    padding: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
  },
  setupContainer: {
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  stepInstruction: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  resendButtonText: {
    color: Colors.brand.accentMagenta,
    fontSize: 16,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: Colors.brand.cardBackgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.brand.textPrimary,
    width: 200,
    marginBottom: 24,
    letterSpacing: 8,
  },
  button: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
