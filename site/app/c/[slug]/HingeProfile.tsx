'use client';

import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { TIKTOK_PROFILES, CURRENT_PROFILE } from './tiktok-profiles';

interface HingeProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  location: string | null;
  occupation: string | null;
  education: string | null;
  height: string | null;
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    order: number;
  }>;
  prompts: Array<{
    id: string;
    category: string;
    question: string;
    answer: string;
    order: number;
  }>;
  preferences: {
    age_range: [number, number] | null;
    distance: number | null;
    looking_for: string | null;
  } | null;
}

interface HingeProfileProps {
  slug: string;
  isOwner?: boolean;
}

// Sample data for TikTok content - easily editable!
const SAMPLE_PROFILE: HingeProfileData = {
  id: 'sample-id',
  username: 'hinge-clone',
  ...TIKTOK_PROFILES[CURRENT_PROFILE as keyof typeof TIKTOK_PROFILES],
  avatar_url: null,
  photos: TIKTOK_PROFILES[CURRENT_PROFILE as keyof typeof TIKTOK_PROFILES].photos.map((photo, index) => ({
    id: `${index + 1}`,
    url: photo.url,
    caption: photo.caption,
    order: index + 1
  })),
  prompts: TIKTOK_PROFILES[CURRENT_PROFILE as keyof typeof TIKTOK_PROFILES].prompts.map((prompt, index) => ({
    id: `${index + 1}`,
    category: prompt.category,
    question: prompt.question,
    answer: prompt.answer,
    order: index + 1
  })),
  preferences: {
    age_range: [25, 35],
    distance: 25,
    looking_for: 'Long-term relationship'
  }
};

export default function HingeProfile({ slug, isOwner = false }: HingeProfileProps) {
  const [profile, setProfile] = useState<HingeProfileData | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Load profile from localStorage or use sample data
    const savedProfile = localStorage.getItem('hinge-profile-data');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        setProfile(SAMPLE_PROFILE);
      }
    } else {
      setProfile(SAMPLE_PROFILE);
    }
  }, []);

  const handleLike = (itemId: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSaveProfile = (updatedProfile: { photos: any[]; prompts: any[] }) => {
    if (!profile) return;

    const newProfile = {
      ...profile,
      photos: updatedProfile.photos,
      prompts: updatedProfile.prompts
    };

    setProfile(newProfile);
    localStorage.setItem('hinge-profile-data', JSON.stringify(newProfile));
  };

  const nextPhoto = () => {
    if (profile?.photos) {
      setCurrentPhotoIndex((prev) => (prev + 1) % profile.photos.length);
    }
  };

  const prevPhoto = () => {
    if (profile?.photos) {
      setCurrentPhotoIndex((prev) => (prev - 1 + profile.photos.length) % profile.photos.length);
    }
  };

  if (!profile) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading profile...</div>
      </div>
    );
  }

  const currentPhoto = profile.photos[currentPhotoIndex];

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#fff', 
        padding: '16px', 
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{profile.full_name}</div>
        {isOwner && (
          <button 
            onClick={() => setShowEditModal(true)}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#A100FF', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Photo Section */}
      <div style={{ position: 'relative', height: '500px', backgroundColor: '#f5f5f5' }}>
        {currentPhoto && (
          <>
            <img 
              src={currentPhoto.url} 
              alt={currentPhoto.caption || 'Profile photo'}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
            
            {/* Photo Navigation */}
            {profile.photos.length > 1 && (
              <>
                <button 
                  onClick={prevPhoto}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  ‹
                </button>
                <button 
                  onClick={nextPhoto}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  ›
                </button>
              </>
            )}

            {/* Photo Counter */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {currentPhotoIndex + 1}/{profile.photos.length}
            </div>

            {/* Like Button */}
            <button 
              onClick={() => handleLike(`photo-${currentPhoto.id}`)}
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                backgroundColor: likedItems.has(`photo-${currentPhoto.id}`) ? '#ff6b6b' : 'rgba(255,255,255,0.9)',
                color: likedItems.has(`photo-${currentPhoto.id}`) ? 'white' : '#333',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {likedItems.has(`photo-${currentPhoto.id}`) ? '❤️' : '🤍'}
            </button>
          </>
        )}
      </div>

      {/* Basic Info */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Avatar src={profile.avatar_url} alt={profile.full_name} size={60} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {profile.full_name}, {profile.age}
            </h1>
            <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
              {profile.occupation} • {profile.location}
            </div>
            {profile.education && (
              <div style={{ color: '#666', fontSize: '14px' }}>
                {profile.education}
              </div>
            )}
            {profile.height && (
              <div style={{ color: '#666', fontSize: '14px' }}>
                {profile.height}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', lineHeight: '1.4' }}>{profile.bio}</div>
          </div>
        )}

        {/* Prompts */}
        {profile.prompts.map((prompt) => (
          <div key={prompt.id} style={{ marginBottom: '24px' }}>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#A100FF', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                {prompt.question}
              </div>
              <div style={{ fontSize: '16px', lineHeight: '1.4' }}>
                {prompt.answer}
              </div>
              
              {/* Like Button for Prompt */}
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleLike(`prompt-${prompt.id}`)}
                  style={{
                    backgroundColor: likedItems.has(`prompt-${prompt.id}`) ? '#ff6b6b' : 'transparent',
                    color: likedItems.has(`prompt-${prompt.id}`) ? 'white' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {likedItems.has(`prompt-${prompt.id}`) ? '❤️' : '🤍'} Like
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Preferences */}
        {profile.preferences && (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '16px', 
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              What I'm looking for
            </div>
            {profile.preferences.looking_for && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Relationship:</strong> {profile.preferences.looking_for}
              </div>
            )}
            {profile.preferences.age_range && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Age range:</strong> {profile.preferences.age_range[0]}-{profile.preferences.age_range[1]}
              </div>
            )}
            {profile.preferences.distance && (
              <div>
                <strong>Distance:</strong> Within {profile.preferences.distance} miles
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ 
        position: 'sticky', 
        bottom: 0, 
        backgroundColor: '#fff', 
        padding: '16px',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '12px'
      }}>
        <button style={{
          flex: 1,
          padding: '12px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          ❤️ Like
        </button>
        <button style={{
          flex: 1,
          padding: '12px',
          backgroundColor: '#A100FF',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          💬 Comment
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && profile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Edit Profile</h3>
            <p style={{ margin: '0 0 16px 0', color: '#666' }}>
              For TikTok content creation, you can easily edit the profile data directly in the code.
              Look for the SAMPLE_PROFILE object at the top of the HingeProfile.tsx file.
            </p>
            <button 
              onClick={() => setShowEditModal(false)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#A100FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
