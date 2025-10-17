import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, FlatList, Image, TextInput, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import AvatarUploader from '@/components/AvatarUploader';

interface HingePhoto {
  id: string;
  uri: string;
  isMain: boolean;
}

interface HingePrompt {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const HINGE_PROMPTS = [
  // About Me
  { category: 'About Me', question: 'The way to win me over is...' },
  { category: 'About Me', question: 'My simple pleasures...' },
  { category: 'About Me', question: 'I go crazy for...' },
  { category: 'About Me', question: 'My most irrational fear...' },
  { category: 'About Me', question: 'My greatest strength...' },
  
  // Let's Chat About
  { category: "Let's Chat About", question: 'We\'ll get along if...' },
  { category: "Let's Chat About", question: 'Together, we could...' },
  { category: "Let's Chat About", question: 'I\'m looking for...' },
  { category: "Let's Chat About", question: 'Dating me is like...' },
  
  // My Type
  { category: 'My Type', question: 'I\'m weirdly attracted to...' },
  { category: 'My Type', question: 'The most spontaneous thing I\'ve done...' },
  { category: 'My Type', question: 'My love language is...' },
  
  // Self-Care
  { category: 'Self-Care', question: 'This year, I really want to...' },
  { category: 'Self-Care', question: 'A life goal of mine...' },
  { category: 'Self-Care', question: 'Typical Sunday...' },
  
  // Story Time
  { category: 'Story Time', question: 'The one thing I\'d love to know about you...' },
  { category: 'Story Time', question: 'My most irrational fear...' },
  { category: 'Story Time', question: 'I\'ll fall for you if...' },
  
  // Date Vibes
  { category: 'Date Vibes', question: 'I\'m a great +1 because...' },
  { category: 'Date Vibes', question: 'My ideal Sunday...' },
  { category: 'Date Vibes', question: 'Best travel story...' },
  
  // Getting Personal
  { category: 'Getting Personal', question: 'I\'m convinced that...' },
  { category: 'Getting Personal', question: 'I\'ll know it\'s time to delete the app when...' },
  { category: 'Getting Personal', question: 'I\'m the type of person who...' },
  
  // Voice First
  { category: 'Voice First', question: 'My voice note for you...' },
  { category: 'Voice First', question: 'I\'m weirdly attracted to...' },
];

export default function HingeCloneScreen() {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<HingePhoto[]>([]);
  const [prompts, setPrompts] = useState<HingePrompt[]>([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ category: string; question: string } | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');

  const addPhoto = useCallback(async () => {
    if (photos.length >= 6) {
      Alert.alert('Photo Limit', 'You can only add up to 6 photos to your Hinge profile.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhoto: HingePhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        isMain: photos.length === 0, // First photo is main
      };
      setPhotos(prev => [...prev, newPhoto]);
    }
  }, [photos.length]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const newPhotos = prev.filter(p => p.id !== photoId);
      // If we removed the main photo, make the first remaining photo the main one
      if (newPhotos.length > 0 && !newPhotos.some(p => p.isMain)) {
        newPhotos[0].isMain = true;
      }
      return newPhotos;
    });
  }, []);

  const setMainPhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.map(p => ({ ...p, isMain: p.id === photoId })));
  }, []);

  const addPrompt = useCallback((category: string, question: string) => {
    if (prompts.length >= 3) {
      Alert.alert('Prompt Limit', 'You can only add up to 3 prompts to your Hinge profile.');
      return;
    }

    setSelectedPrompt({ category, question });
    setPromptAnswer('');
    setShowPromptModal(true);
  }, [prompts.length]);

  const savePrompt = useCallback(() => {
    if (!selectedPrompt || !promptAnswer.trim()) {
      Alert.alert('Error', 'Please enter an answer for the prompt.');
      return;
    }

    const newPrompt: HingePrompt = {
      id: Date.now().toString(),
      category: selectedPrompt.category,
      question: selectedPrompt.question,
      answer: promptAnswer.trim(),
    };

    setPrompts(prev => [...prev, newPrompt]);
    setShowPromptModal(false);
    setSelectedPrompt(null);
    setPromptAnswer('');
  }, [selectedPrompt, promptAnswer]);

  const removePrompt = useCallback((promptId: string) => {
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  }, []);

  const renderPhoto = ({ item }: { item: HingePhoto }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {item.isMain && <View style={styles.mainPhotoBadge}><Text style={styles.mainPhotoText}>Main</Text></View>}
      <TouchableOpacity 
        style={styles.removePhotoButton} 
        onPress={() => removePhoto(item.id)}
      >
        <Text style={styles.removePhotoText}>×</Text>
      </TouchableOpacity>
      {!item.isMain && (
        <TouchableOpacity 
          style={styles.setMainButton} 
          onPress={() => setMainPhoto(item.id)}
        >
          <Text style={styles.setMainText}>Set as Main</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPrompt = ({ item }: { item: HingePrompt }) => (
    <View style={styles.promptCard}>
      <View style={styles.promptHeader}>
        <Text style={styles.promptCategory}>{item.category}</Text>
        <TouchableOpacity onPress={() => removePrompt(item.id)}>
          <Text style={styles.removePromptText}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.promptQuestion}>{item.question}</Text>
      <Text style={styles.promptAnswer}>{item.answer}</Text>
    </View>
  );

  const groupedPrompts = HINGE_PROMPTS.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, typeof HINGE_PROMPTS>);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hinge Profile Clone</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({photos.length}/6)</Text>
          <Text style={styles.sectionSubtitle}>Add up to 6 photos. Your first photo will be your main profile picture.</Text>
          
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosList}
          />
          
          {photos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={addPhoto}>
              <ExpoLinearGradient
                colors={[Colors.brand.gradientStart, Colors.brand.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addPhotoGradient}
              />
              <Text style={styles.addPhotoText}>+ Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Prompts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prompts ({prompts.length}/3)</Text>
          <Text style={styles.sectionSubtitle}>Choose up to 3 prompts to showcase your personality.</Text>
          
          <FlatList
            data={prompts}
            renderItem={renderPrompt}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.promptsList}
          />
          
          {prompts.length < 3 && (
            <View style={styles.promptCategories}>
              {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
                <View key={category} style={styles.promptCategoryGroup}>
                  <Text style={styles.promptCategoryTitle}>{category}</Text>
                  {categoryPrompts.slice(0, 3).map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.promptOption}
                      onPress={() => addPrompt(prompt.category, prompt.question)}
                    >
                      <Text style={styles.promptOptionText}>{prompt.question}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Preview Section */}
        {(photos.length > 0 || prompts.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Preview</Text>
            <View style={styles.previewCard}>
              {photos.length > 0 && (
                <View style={styles.previewPhotoContainer}>
                  <Image 
                    source={{ uri: photos.find(p => p.isMain)?.uri || photos[0].uri }} 
                    style={styles.previewPhoto} 
                  />
                </View>
              )}
              {prompts.map((prompt) => (
                <View key={prompt.id} style={styles.previewPrompt}>
                  <Text style={styles.previewPromptQuestion}>{prompt.question}</Text>
                  <Text style={styles.previewPromptAnswer}>{prompt.answer}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Prompt Answer Modal */}
      <Modal
        visible={showPromptModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPromptModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Answer Prompt</Text>
            <TouchableOpacity onPress={savePrompt}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalPromptCategory}>{selectedPrompt?.category}</Text>
            <Text style={styles.modalPromptQuestion}>{selectedPrompt?.question}</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Type your answer here..."
              value={promptAnswer}
              onChangeText={setPromptAnswer}
              multiline
              textAlignVertical="top"
              maxLength={150}
            />
            <Text style={styles.modalCharCount}>{promptAnswer.length}/150</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.brand.cardBackground,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: Colors.brand.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 28,
    padding: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  photosList: {
    paddingVertical: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackgroundLight,
  },
  mainPhotoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.brand.accentOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainPhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  setMainButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  setMainText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addPhotoButton: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  addPhotoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
  },
  addPhotoText: {
    color: Colors.brand.textOnGradient,
    fontSize: 16,
    fontWeight: '700',
    zIndex: 1,
  },
  promptsList: {
    paddingVertical: 10,
  },
  promptCard: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  promptCategory: {
    fontSize: 14,
    color: Colors.brand.accentOrange,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removePromptText: {
    color: Colors.brand.textSecondary,
    fontSize: 20,
    fontWeight: '700',
  },
  promptQuestion: {
    fontSize: 18,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  promptAnswer: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 22,
  },
  promptCategories: {
    marginTop: 16,
  },
  promptCategoryGroup: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  promptCategoryTitle: {
    fontSize: 18,
    color: Colors.brand.textPrimary,
    fontWeight: '700',
    marginBottom: 12,
  },
  promptOption: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptOptionText: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    lineHeight: 22,
  },
  previewCard: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  previewPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.brand.cardBackground,
  },
  previewPrompt: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  previewPromptQuestion: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewPromptAnswer: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.brand.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.brand.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.divider,
  },
  modalCancelText: {
    color: Colors.brand.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
  },
  modalSaveText: {
    color: Colors.brand.accentOrange,
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalPromptCategory: {
    fontSize: 14,
    color: Colors.brand.accentOrange,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalPromptQuestion: {
    fontSize: 20,
    color: Colors.brand.textPrimary,
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 28,
  },
  modalTextInput: {
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.brand.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCharCount: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
});

