import React, { useState } from 'react';
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export default function TwoFactorVerifyScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber?: string }>();
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode || !phoneNumber) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setVerifying(true);
      
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          phone: phoneNumber,
          code: verificationCode,
          action: 'verify'
        }
      });

      if (error) throw error;

      // Success - redirect to main app
      router.replace('/(tabs)/requests');
    } catch (error: any) {
      console.error('Error verifying SMS 2FA:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      setVerificationCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!phoneNumber) return;

    try {
      setSendingCode(true);
      
      const { data, error } = await supabase.functions.invoke('send-sms-code', {
        body: {
          phone: phoneNumber,
          action: 'verify'
        }
      });

      if (error) throw error;

      Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
    } catch (error: any) {
      console.error('Error resending SMS code:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleBackToLogin = () => {
    // Sign out and go back to login
    supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>SMS Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent to {phoneNumber}
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
          style={[styles.button, verifying && styles.buttonDisabled]} 
          onPress={handleVerify}
          disabled={verifying || verificationCode.length !== 6}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={handleResendCode}
          disabled={sendingCode}
        >
          <Text style={styles.resendButtonText}>
            {sendingCode ? 'Sending...' : 'Resend Code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
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
    marginBottom: 32,
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
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.brand.accentMagenta,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: Colors.brand.accentMagenta,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  resendButtonText: {
    color: Colors.brand.accentMagenta,
    fontSize: 16,
    fontWeight: '600',
  },
});
