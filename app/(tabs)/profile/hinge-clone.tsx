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
const columnWidth = screenWidth / 3;

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

  const renderPhoto = ({ item }: { item: HingePhoto }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {item.caption && (
        <Text style={styles.photoCaption}>{item.caption}</Text>
      )}
    </View>
  );

  const renderPrompt = ({ item }: { item: HingePrompt }) => (
    <View style={styles.promptContainer}>
      <Text style={styles.promptQuestion}>{item.question}</Text>
      <Text style={styles.promptAnswer}>{item.answer}</Text>
    </View>
  );

  const renderProfileDetail = (icon: string, label: string, value: string) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );

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

      {/* Three Column Layout */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.columnsContainer}>
          {/* Column 1 */}
          <View style={[styles.column, { width: columnWidth }]}>
            <View style={styles.photoSection}>
              <Image source={{ uri: photos[0]?.uri }} style={styles.mainPhoto} />
              <View style={styles.promptSection}>
                <Text style={styles.promptQuestion}>{prompts[0]?.question}</Text>
                <Text style={styles.promptAnswer}>{prompts[0]?.answer}</Text>
              </View>
            </View>
          </View>

          {/* Column 2 */}
          <View style={[styles.column, { width: columnWidth }]}>
            <View style={styles.photoSection}>
              <Image source={{ uri: photos[1]?.uri }} style={styles.mainPhoto} />
              <View style={styles.detailsSection}>
                <Text style={styles.ageText}>{profileDetails.age}</Text>
                {renderProfileDetail('📏', 'Height', profileDetails.height)}
                {renderProfileDetail('📍', 'Location', profileDetails.location)}
                {renderProfileDetail('🎓', 'Education', profileDetails.education)}
                {renderProfileDetail('🏠', 'Hometown', profileDetails.hometown)}
                {renderProfileDetail('🏛️', 'Political Leaning', profileDetails.politicalLeaning)}
              </View>
            </View>
          </View>

          {/* Column 3 */}
          <View style={[styles.column, { width: columnWidth }]}>
            <View style={styles.photoSection}>
              <Text style={styles.photoCaption}>{photos[2]?.caption}</Text>
              <Image source={{ uri: photos[2]?.uri }} style={styles.mainPhoto} />
              <View style={styles.promptSection}>
                <Text style={styles.promptQuestion}>{prompts[1]?.question}</Text>
                <Text style={styles.promptAnswer}>{prompts[1]?.answer}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
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
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  columnsContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  column: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  photoSection: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
  },
  mainPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
  },
  photoCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
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
  },
  promptAnswer: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 18,
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
  },
});

