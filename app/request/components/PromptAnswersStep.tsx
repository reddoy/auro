import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Colors from '@/constants/Colors';
import type { RequestData } from '../index';

type Props = {
  requestData: RequestData;
  onMessageChange: (message: string) => void;
  onNext: () => void;
  onBack: () => void;
  supabase: any;
};

export default function PromptAnswersStep({ requestData, onMessageChange, onNext, onBack, supabase }: Props) {
  const [message, setMessage] = useState(requestData.message || '');

  const handleNext = () => {
    onMessageChange(message);
    onNext();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tell Us About Yourself</Text>
      <Text style={styles.description}>
        Share any information you'd like your reviewer to know
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter your message..."
        placeholderTextColor={Colors.brand.textSecondary}
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    marginBottom: 24,
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
