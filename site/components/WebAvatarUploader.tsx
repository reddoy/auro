'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Upload, X, User, Camera } from 'lucide-react';
import CircularCropModal from './CircularCropModal';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview URL when currentAvatarUrl changes (e.g., after page refresh)
  React.useEffect(() => {
    if (currentAvatarUrl) {
      // Only set preview URL if it's not a blob URL (blob URLs don't persist across refreshes)
      if (!currentAvatarUrl.startsWith('blob:')) {
        setPreviewUrl(currentAvatarUrl);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [currentAvatarUrl]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  const handleFileSelect = useCallback((file: File) => {
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

    // Show crop modal
    setSelectedFile(file);
    setShowCropModal(true);
  }, []);

  const handleCropComplete = useCallback(async (croppedFile: File) => {
    try {
      setUploading(true);
      setShowCropModal(false);

      // Create temporary preview URL from cropped file (for immediate feedback)
      const tempPreview = URL.createObjectURL(croppedFile);
      setPreviewUrl(tempPreview);

      // Get signed upload URL
      const uploadSessionId = `reviewer-signup-${Date.now()}`;
      const response = await fetch('/api/storage/signed-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: croppedFile.name,
          contentType: croppedFile.type,
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

      // Generate display URL that will persist across page refreshes
      const displayUrl = `/api/storage/signed-view?path=${encodeURIComponent(path)}&bucket=avatars`;
      
      // Update preview to use the persistent URL
      setPreviewUrl(displayUrl);
      
      // Clean up the temporary blob URL
      URL.revokeObjectURL(tempPreview);
      
      onAvatarChange(displayUrl, path);
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  }, [currentAvatarUrl, onAvatarChange]);

  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    setSelectedFile(null);
  }, []);

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
    <>
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
                  borderRadius: '50%',
                  // Avoid clip-path on mobile to prevent mask distortion during zoom
                  // and promote the layer for smoother rendering
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)'
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      WebkitTransform: 'translateZ(0)',
                      transform: 'translateZ(0)',
                      willChange: 'transform'
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

      {/* Crop Modal */}
      {selectedFile && (
        <CircularCropModal
          imageFile={selectedFile}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          isOpen={showCropModal}
        />
      )}
    </>
  );
}
