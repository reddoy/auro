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
    checkSMS2FAStatus();
  }, []);

  const checkSMS2FAStatus = async () => {
    try {
      setLoading(true);
      
      // Check if SMS 2FA is already enabled
      const { data, error } = await supabase
        .from('user_two_factor')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.enabled) {
        setHasSMS2FA(true);
        setPhoneNumber(data.phone);
        Alert.alert(
          'Two-Factor Authentication Enabled',
          'You already have SMS 2FA enabled for your account.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
    } catch (error: any) {
      console.error('Error checking SMS 2FA status:', error);
      Alert.alert('Error', 'Failed to check two-factor authentication status');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s|-|\(|\)/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    try {
      setSendingCode(true);
      
      const { data, error } = await supabase.functions.invoke('send-sms-code', {
        body: {
          phone: phoneNumber,
          action: 'setup'
        }
      });

      if (error) throw error;

      setShowVerification(true);
      Alert.alert('Code Sent', 'We\'ve sent a verification code to your phone number.');
    } catch (error: any) {
      console.error('Error sending SMS code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || !phoneNumber) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setVerifyingCode(true);
      
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          phone: phoneNumber,
          code: verificationCode,
          action: 'setup'
        }
      });

      if (error) throw error;

      Alert.alert(
        'Success!',
        'SMS two-factor authentication has been enabled for your account.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error verifying SMS code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      setVerificationCode('');
    } finally {
      setVerifyingCode(false);
    }
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
              style={[styles.button, sendingCode && styles.buttonDisabled]} 
              onPress={sendVerificationCode}
              disabled={sendingCode || !phoneNumber}
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
              style={[styles.button, verifyingCode && styles.buttonDisabled]} 
              onPress={verifyAndEnable}
              disabled={verifyingCode || verificationCode.length !== 6}
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
              disabled={sendingCode}
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
