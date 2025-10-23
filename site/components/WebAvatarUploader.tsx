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

  // Function to crop image to square
  const cropImageToSquare = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate square dimensions
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;

        // Draw cropped image centered
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not create blob'));
            return;
          }
          
          const croppedFile = new File([blob], file.name, { type: file.type });
          resolve(croppedFile);
        }, file.type, 0.9);
      };
      
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

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

      // Crop image to square for better circular display
      const croppedFile = await cropImageToSquare(file);

      // Create preview URL from cropped file
      const preview = URL.createObjectURL(croppedFile);
      setPreviewUrl(preview);

      // Get signed upload URL
      const uploadSessionId = `reviewer-signup-${Date.now()}`;
      const response = await fetch('/api/storage/signed-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          category: 'avatar',
          uploadSessionId: uploadSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { signedUrl, path, token } = await response.json();

      // Upload cropped file to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: croppedFile,
        headers: {
          'Content-Type': croppedFile.type,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      // Generate display URL
      const displayUrl = `/api/storage/signed-view?path=${encodeURIComponent(path)}`;
      
      onAvatarChange(displayUrl, path);
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  }, [currentAvatarUrl, onAvatarChange, cropImageToSquare]);

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
              className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-dashed border-gray-600 hover:border-orange-500 transition-colors"
              style={{ 
                width: size, 
                height: size,
                borderRadius: '50%', // Make it circular
                clipPath: 'circle(50%)' // Ensure perfect circle
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                  style={{
                    borderRadius: '50%', // Ensure the image is circular
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400" style={{ borderRadius: '50%' }}>
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
