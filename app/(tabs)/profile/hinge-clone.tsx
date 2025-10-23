import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, FlatList, Image, TextInput, Modal, ScrollView, Dimensions } from 'react-native';
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
  caption?: string;
}

interface HingePrompt {
  id: string;
  question: string;
  answer: string;
}

interface ProfileDetails {
  age: string;
  height: string;
  location: string;
  education: string;
  hometown: string;
  politicalLeaning: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function HingeCloneScreen() {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<HingePhoto[]>([
    {
      id: '1',
      uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
      isMain: true,
    },
    {
      id: '2', 
      uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
      isMain: false,
    },
    {
      id: '3',
      uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      isMain: false,
      caption: 'Me in the wild'
    }
  ]);
  
  const [prompts, setPrompts] = useState<HingePrompt[]>([
    {
      id: '1',
      question: 'The best way to ask me out is by',
      answer: 'Tell me the time a place. Skip the small talk, let\'s go on a date - and if you have a friend, I\'ll bring my friend and we\'ll make it a double date.'
    },
    {
      id: '2',
      question: 'My Love Language is',
      answer: 'Early 2000s R&B hits.'
    }
  ]);
  
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>({
    age: '27',
    height: '5\'2"',
    location: 'Prospect Heights',
    education: 'University of Washington',
    hometown: 'Newport Beach, California',
    politicalLeaning: 'Liberal'
  });
  
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ question: string } | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [activeTab, setActiveTab] = useState<'Edit' | 'View'>('View');
  const [topPhotoEnabled, setTopPhotoEnabled] = useState(false);


  const renderProfileDetail = (icon: string, label: string, value: string) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );

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
        isMain: photos.length === 0,
      };
      setPhotos(prev => [...prev, newPhoto]);
    }
  }, [photos.length]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  const addPrompt = useCallback(() => {
    if (prompts.length >= 3) {
      Alert.alert('Prompt Limit', 'You can only add up to 3 prompts to your Hinge profile.');
      return;
    }
    setSelectedPrompt({ question: 'A life goal of mine' });
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

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={[styles.statusBar, { paddingTop: insets.top }]}>
        <Text style={styles.statusTime}>11:53</Text>
        <View style={styles.batteryIcon}>
          <Text style={styles.batteryText}>🔋</Text>
        </View>
      </View>

      {/* Search Icon */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {/* Main Navigation */}
      <View style={styles.mainNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
          <Text style={styles.navButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.profileName}>Maya</Text>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Edit/View Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Edit' && styles.activeTab]}
          onPress={() => setActiveTab('Edit')}
        >
          <Text style={[styles.tabText, activeTab === 'Edit' && styles.activeTabText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'View' && styles.activeTab]}
          onPress={() => setActiveTab('View')}
        >
          <Text style={[styles.tabText, activeTab === 'View' && styles.activeTabText]}>View</Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'View' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.profileContainer}>
            {/* Photo 1 with Prompt */}
            <View style={styles.photoSection}>
              <Image source={{ uri: photos[0]?.uri }} style={styles.profilePhoto} />
              <View style={styles.promptSection}>
                <Text style={styles.promptQuestion}>{prompts[0]?.question}</Text>
                <Text style={styles.promptAnswer}>{prompts[0]?.answer}</Text>
              </View>
            </View>

            {/* Photo 2 with Details */}
            <View style={styles.photoSection}>
              <Image source={{ uri: photos[1]?.uri }} style={styles.profilePhoto} />
              <View style={styles.detailsSection}>
                <Text style={styles.ageText}>{profileDetails.age}</Text>
                {renderProfileDetail('📏', 'Height', profileDetails.height)}
                {renderProfileDetail('📍', 'Location', profileDetails.location)}
                {renderProfileDetail('🎓', 'Education', profileDetails.education)}
                {renderProfileDetail('🏠', 'Hometown', profileDetails.hometown)}
                {renderProfileDetail('🏛️', 'Political Leaning', profileDetails.politicalLeaning)}
              </View>
            </View>

            {/* Photo 3 with Caption and Prompt */}
            <View style={styles.photoSection}>
              <Text style={styles.photoCaption}>{photos[2]?.caption}</Text>
              <Image source={{ uri: photos[2]?.uri }} style={styles.profilePhoto} />
              <View style={styles.promptSection}>
                <Text style={styles.promptQuestion}>{prompts[1]?.question}</Text>
                <Text style={styles.promptAnswer}>{prompts[1]?.answer}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.editContainer}>
            {/* My Photos & Videos Section */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>My Photos & Videos</Text>
              
              {/* Photo Grid */}
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={photo.id} style={styles.photoGridItem}>
                    <Image source={{ uri: photo.uri }} style={styles.gridPhoto} />
                    <TouchableOpacity 
                      style={styles.removePhotoBtn}
                      onPress={() => removePhoto(photo.id)}
                    >
                      <Text style={styles.removePhotoText}>×</Text>
                    </TouchableOpacity>
                    {index < 2 && (
                      <View style={styles.promptTag}>
                        <Text style={styles.promptTagText}>✓ Prompt</Text>
                      </View>
                    )}
                  </View>
                ))}
                {photos.length < 6 && (
                  <TouchableOpacity style={styles.addPhotoGridBtn} onPress={addPhoto}>
                    <Text style={styles.addPhotoGridText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.editInstruction}>Tap to edit, drag to reorder.</Text>
              
              {/* Top Photo Feature */}
              <View style={styles.featureRow}>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Top Photo</Text>
                  <Text style={styles.featureSubtitle}>We'll continuously test your profile pics and put the most popular one first.</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.toggle, topPhotoEnabled && styles.toggleActive]}
                  onPress={() => setTopPhotoEnabled(!topPhotoEnabled)}
                >
                  <View style={[styles.toggleThumb, topPhotoEnabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              
              {/* Get verified Feature */}
              <TouchableOpacity style={styles.featureRow}>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Get verified</Text>
                  <Text style={styles.featureSubtitle}>Show others your pics are really you.</Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Written Prompts Section */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Written Prompts ({prompts.length})</Text>
              
              {prompts.map((prompt) => (
                <View key={prompt.id} style={styles.promptCard}>
                  <TouchableOpacity 
                    style={styles.removePromptBtn}
                    onPress={() => removePrompt(prompt.id)}
                  >
                    <Text style={styles.removePromptText}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.promptCardQuestion}>{prompt.question}</Text>
                  <Text style={styles.promptCardAnswer}>{prompt.answer}</Text>
                  <View style={styles.promptFeedback}>
                    <Text style={styles.promptFeedbackText}>✓ Great answer</Text>
                  </View>
                </View>
              ))}
              
              {prompts.length < 3 && (
                <TouchableOpacity style={styles.addPromptBtn} onPress={addPrompt}>
                  <Text style={styles.addPromptText}>+ Add a prompt</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      )}

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
    backgroundColor: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  statusTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'ModernEra-Regular',
  },
  batteryIcon: {
    backgroundColor: 'transparent',
  },
  batteryText: {
    fontSize: 16,
  },
  searchContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    fontSize: 20,
  },
  mainNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    backgroundColor: 'transparent',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'ModernEra-Regular',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'ModernEra-Medium',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'ModernEra-Regular',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  editContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  editSection: {
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 15,
    fontFamily: 'ModernEra-Medium',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  photoGridItem: {
    width: (screenWidth - 60) / 3,
    aspectRatio: 1,
    marginBottom: 10,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'ModernEra-Medium',
  },
  promptTag: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  promptTagText: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'ModernEra-Regular',
  },
  addPhotoGridBtn: {
    width: (screenWidth - 60) / 3,
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  addPhotoGridText: {
    fontSize: 24,
    color: '#666666',
    fontFamily: 'ModernEra-Medium',
  },
  editInstruction: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 20,
    fontFamily: 'ModernEra-Regular',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  featureContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    fontFamily: 'ModernEra-Medium',
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'ModernEra-Regular',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#8B5CF6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 10,
  },
  promptCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    position: 'relative',
  },
  removePromptBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePromptText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'ModernEra-Medium',
  },
  promptCardQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'ModernEra-Medium',
  },
  promptCardAnswer: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'ModernEra-Regular',
  },
  promptFeedback: {
    backgroundColor: 'transparent',
  },
  promptFeedbackText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'ModernEra-Regular',
  },
  addPromptBtn: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  addPromptText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'ModernEra-Regular',
  },
  photoSection: {
    backgroundColor: 'transparent',
    marginBottom: 30,
  },
  profilePhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
  },
  photoCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'ModernEra-Medium',
  },
  promptSection: {
    marginTop: 15,
    backgroundColor: 'transparent',
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 18,
    fontFamily: 'ModernEra-Medium',
  },
  promptAnswer: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 18,
    fontFamily: 'ModernEra-Regular',
  },
  detailsSection: {
    marginTop: 15,
    backgroundColor: 'transparent',
  },
  ageText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 15,
    fontFamily: 'ModernEra-Medium',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
    fontFamily: 'ModernEra-Regular',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCancelText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ModernEra-Regular',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'ModernEra-Medium',
  },
  modalSaveText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'ModernEra-Medium',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalPromptQuestion: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: 'ModernEra-Medium',
  },
  modalTextInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#000000',
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: 'ModernEra-Regular',
  },
  modalCharCount: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'right',
    marginTop: 8,
    fontFamily: 'ModernEra-Regular',
  },
});

