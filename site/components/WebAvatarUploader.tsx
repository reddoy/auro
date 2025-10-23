'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Upload, X, User, Camera } from 'lucide-react';

interface WebAvatarUploaderProps {
  currentAvatarUrl?: string | null;
  onAvatarChange: (avatarUrl: string | null, avatarPath: string | null) => void;
  size?: number;
  className?: string;
}

export default function WebAvatarUploader({ 
  currentAvatarUrl, 
  onAvatarChange, 
  size = 120,
  className = ''
}: WebAvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to Supabase storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'avatar');
      formData.append('uploadSessionId', `reviewer-signup-${Date.now()}`);

      const response = await fetch('/api/storage/signed-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { signedUrl, path, token } = await response.json();

      // Upload file to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      // Generate display URL
      const displayUrl = `/api/storage/signed-view?path=${encodeURIComponent(path)}`;
      
      onAvatarChange(displayUrl, path);
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload image. Please try again.');
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  }, [currentAvatarUrl, onAvatarChange]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleRemoveAvatar = useCallback(() => {
    setPreviewUrl(null);
    onAvatarChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAvatarChange]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative">
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
          onClick={handleClick}
        >
          <CardContent className="p-0">
            <div 
              className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors"
              style={{ width: size, height: size }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium">Add Photo</span>
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {previewUrl && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAvatar();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="text-center">
        <p className="text-sm text-gray-400 mb-2">
          Upload a clear photo of yourself
        </p>
        <p className="text-xs text-gray-500">
          JPG, PNG up to 5MB
        </p>
      </div>
    </div>
  );
}
