import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, View as RNView, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getCurrentProfile, updateProfile } from '@/lib/profile';
import type { Profile } from '@/types';
import { MotionView, cardEntrance } from '@/components/motion';
import { SkeletonBlock, SkeletonCircle, SkeletonParagraph } from '@/components/Skeletons';
import { copyToClipboard } from '@/lib/clipboard';

const socialIcons = {
  instagram: require('../../../Instagram_icon-removebg-preview.png'),
  tiktok: require('../../../tiktok-icon-free-png-removebg-preview.png'),
};

export default function ProfileLinkScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getCurrentProfile();
        setProfile(p);
        setEditingUsername(p?.username || '');
      } catch (e: any) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSaveUsername = useCallback(async () => {
    try {
      setSaving(true);
      const username = editingUsername.trim().toLowerCase();
      
      // Validate username
      if (username && !/^[a-z0-9_-]+$/.test(username)) {
        Alert.alert('Invalid Username', 'Username can only contain letters, numbers, underscores, and hyphens.');
        return;
      }

      const updated = await updateProfile({ username: username || null });
      setProfile(updated);
      
      Alert.alert(
        'Profile Link Updated!', 
        username 
          ? `Your profile link is now: https://www.appauro.com/${username}`
          : 'Your profile link has been cleared.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile link');
    } finally {
      setSaving(false);
    }
  }, [editingUsername]);

  const handleCopyLink = useCallback(async () => {
    if (!profile) return;
    
    const slug = profile.username || profile.id;
    const reviewerUrl = `https://www.appauro.com/${slug}`;
    
    try {
      await copyToClipboard(reviewerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('Copied!', 'Your profile link has been copied to clipboard.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  }, [profile]);

  if (loading) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <RNView style={[styles.header, { paddingTop: 12, backgroundColor: 'transparent' }]}>
          <RNView style={{ marginRight: 12, backgroundColor: 'transparent' }}>
            <SkeletonCircle size={40} />
          </RNView>
          <SkeletonBlock width={160} height={24} radius={12} />
          <RNView style={[styles.headerSpacer, { backgroundColor: 'transparent' }]} />
        </RNView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 68 + insets.bottom + 24, paddingHorizontal: 20, paddingTop: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <MotionView entering={cardEntrance(0)} style={styles.skeletonCard}>
            <SkeletonParagraph lines={3} widths={['100%', '90%', '85%']} />
          </MotionView>

          <MotionView entering={cardEntrance(1)} style={styles.skeletonCard}>
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="100%" height={52} radius={18} style={{ marginTop: 16 }} />
          </MotionView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const profileUrl = profile ? `https://www.appauro.com/${profile.username || profile.id}` : '';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Link</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 68 + insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Share Section */}
          <MotionView entering={cardEntrance(0)} style={styles.shareSection}>
            <View style={styles.socialIconsContainer}>
              <Image source={socialIcons.instagram} style={styles.socialIcon} resizeMode="contain" />
              <Image source={socialIcons.tiktok} style={styles.socialIcon} resizeMode="contain" />
            </View>
            <Text style={styles.shareTitle}>Share Your Profile Link</Text>
            <Text style={styles.shareDescription}>
              Share your Auro profile link directly to your Instagram and TikTok profiles to help get more reviews and boost your profile. When you make videos on TikTok, people can click on your link and instantly request a review from you.
            </Text>
          </MotionView>

          {/* Profile Link Display */}
          <MotionView entering={cardEntrance(1)} style={styles.linkCard}>
            <Text style={styles.linkLabel}>Your Profile Link</Text>
            <View style={styles.linkDisplayContainer}>
              <Text style={styles.linkDisplay} numberOfLines={1} ellipsizeMode="middle">
                {profileUrl}
              </Text>
              <TouchableOpacity 
                onPress={handleCopyLink}
                style={[styles.copyButton, copied && styles.copyButtonActive]}
              >
                <Text style={styles.copyButtonText}>
                  {copied ? '✓ Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </MotionView>

          {/* Edit Username Section */}
          <MotionView entering={cardEntrance(2)} style={styles.editSection}>
            <Text style={styles.editTitle}>Customize Your Link</Text>
            <Text style={styles.editDescription}>
              Set a custom username to make your profile link more memorable. Your link will be: appauro.com/yourusername
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.usernameInput}
                value={editingUsername}
                onChangeText={setEditingUsername}
                placeholder="yourusername"
                placeholderTextColor={Colors.brand.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              <Text style={styles.inputHint}>
                Only letters, numbers, underscores, and hyphens allowed
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]} 
              onPress={handleSaveUsername}
              disabled={saving || loading}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Username'}
              </Text>
            </TouchableOpacity>
          </MotionView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.brand.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: Colors.brand.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.brand.cardBackground
  },
  backButtonText: { 
    fontSize: 24, 
    color: Colors.brand.textPrimary,
    fontWeight: '300'
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.brand.textPrimary,
    fontFamily: 'Poppins_700Bold'
  },
  headerSpacer: { 
    width: 40 
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 20 
  },
  shareSection: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    alignItems: 'center',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  socialIcon: {
    width: 48,
    height: 48,
  },
  shareTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  shareDescription: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  linkCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brand.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  linkDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.cardBackgroundLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  linkDisplay: {
    flex: 1,
    fontSize: 14,
    color: Colors.brand.textPrimary,
    fontWeight: '500',
    marginRight: 12,
  },
  copyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.brand.accentOrange,
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  copyButtonActive: {
    backgroundColor: '#10b981',
  },
  copyButtonText: {
    color: Colors.brand.textOnGradient,
    fontWeight: '700',
    fontSize: 14,
  },
  editSection: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    fontFamily: 'Poppins_700Bold',
  },
  editDescription: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
  },
  usernameInput: {
    borderWidth: 2,
    borderColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    backgroundColor: Colors.brand.cardBackgroundLight,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.brand.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: Colors.brand.accentOrange,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.brand.textOnGradient,
    fontSize: 18,
    fontWeight: '700',
  },
  skeletonCard: {
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
});

