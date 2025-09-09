'use client';

import React, { useState, useRef } from 'react';

type Photos = {
  selfie?: string;
  outfits: string[];
  roomTourPhotos: string[];
  datingProfile?: string;
};

type Props = {
  photos: Photos;
  onPhotosChange: (photos: Photos) => void;
  onNext: () => void;
  onBack: () => void;
  supabase: any;
};

export default function PhotoUpload({ photos, onPhotosChange, onNext, onBack, supabase }: Props) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const outfitsInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const datingInputRef = useRef<HTMLInputElement>(null);

  const uploadToSupabase = async (file: File, category: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${category}.${fileExt}`;
    const filePath = `temp-uploads/${fileName}`;

    setUploadProgress(prev => ({ ...prev, [category]: 0 }));

    const { data, error } = await supabase.storage
      .from('request-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from('request-media')
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

    setUploadProgress(prev => ({ ...prev, [category]: 100 }));
    
    return urlData?.signedUrl || '';
  };

  const handleFileUpload = async (files: FileList | null, category: 'selfie' | 'outfits' | 'roomTourPhotos' | 'datingProfile', isMultiple: boolean = false) => {
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [category]: true }));

    try {
      if (isMultiple) {
        const uploadPromises = Array.from(files).map((file, index) => 
          uploadToSupabase(file, `${category}_${index}`)
        );
        const urls = await Promise.all(uploadPromises);
        
        if (category === 'outfits') {
          onPhotosChange({ ...photos, outfits: [...photos.outfits, ...urls] });
        } else if (category === 'roomTourPhotos') {
          onPhotosChange({ ...photos, roomTourPhotos: [...photos.roomTourPhotos, ...urls] });
        }
      } else {
        const url = await uploadToSupabase(files[0], category);
        onPhotosChange({ ...photos, [category]: url });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [category]: false }));
      setUploadProgress(prev => ({ ...prev, [category]: 0 }));
    }
  };

  const removePhoto = (category: 'selfie' | 'outfits' | 'roomTourPhotos' | 'datingProfile', index?: number) => {
    if (category === 'outfits' && typeof index === 'number') {
      const newOutfits = photos.outfits.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, outfits: newOutfits });
    } else if (category === 'roomTourPhotos' && typeof index === 'number') {
      const newRoomPhotos = photos.roomTourPhotos.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, roomTourPhotos: newRoomPhotos });
    } else {
      onPhotosChange({ ...photos, [category]: undefined });
    }
  };

  const canProceed = photos.selfie && photos.outfits.length > 0;

  return (
    <div className="photo-upload">
      <div className="step-header">
        <h2>Upload Your Photos</h2>
        <p>Upload photos for your review. A selfie and at least one outfit photo are required.</p>
      </div>

      <div className="upload-sections">
        {/* Selfie Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Selfie <span className="required">*</span></h3>
            <p>A clear photo of your face for attractiveness rating</p>
          </div>
          
          <div className="photo-grid">
            {photos.selfie ? (
              <div className="photo-item">
                <img src={photos.selfie} alt="Selfie" />
                <button
                  type="button"
                  className="remove-photo"
                  onClick={() => removePhoto('selfie')}
                >
                  ×
                </button>
              </div>
            ) : (
              <div 
                className={`upload-placeholder ${uploading.selfie ? 'uploading' : ''}`}
                onClick={() => selfieInputRef.current?.click()}
              >
                {uploading.selfie ? (
                  <div className="upload-progress">
                    <div className="spinner"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📸</div>
                    <span>Click to upload selfie</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files, 'selfie')}
          />
        </div>

        {/* Outfits Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Outfit Photos <span className="required">*</span></h3>
            <p>Full body photos showing your style and wardrobe</p>
          </div>
          
          <div className="photo-grid">
            {photos.outfits.map((outfit, index) => (
              <div key={index} className="photo-item">
                <img src={outfit} alt={`Outfit ${index + 1}`} />
                <button
                  type="button"
                  className="remove-photo"
                  onClick={() => removePhoto('outfits', index)}
                >
                  ×
                </button>
              </div>
            ))}
            
            <div 
              className={`upload-placeholder ${uploading.outfits ? 'uploading' : ''}`}
              onClick={() => outfitsInputRef.current?.click()}
            >
              {uploading.outfits ? (
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="upload-icon">👔</div>
                  <span>Add outfit photos</span>
                </>
              )}
            </div>
          </div>
          
          <input
            ref={outfitsInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files, 'outfits', true)}
          />
        </div>

        {/* Room Tour Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Room Tour Photos</h3>
            <p>Photos of your living space for room setup feedback</p>
          </div>
          
          <div className="photo-grid">
            {photos.roomTourPhotos.map((room, index) => (
              <div key={index} className="photo-item">
                <img src={room} alt={`Room ${index + 1}`} />
                <button
                  type="button"
                  className="remove-photo"
                  onClick={() => removePhoto('roomTourPhotos', index)}
                >
                  ×
                </button>
              </div>
            ))}
            
            <div 
              className={`upload-placeholder ${uploading.roomTourPhotos ? 'uploading' : ''}`}
              onClick={() => roomInputRef.current?.click()}
            >
              {uploading.roomTourPhotos ? (
                <div className="upload-progress">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="upload-icon">🏠</div>
                  <span>Add room photos</span>
                </>
              )}
            </div>
          </div>
          
          <input
            ref={roomInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files, 'roomTourPhotos', true)}
          />
        </div>

        {/* Dating Profile Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Dating Profile Screenshot</h3>
            <p>Optional: Screenshot of your dating app profile for additional feedback</p>
          </div>
          
          <div className="photo-grid">
            {photos.datingProfile ? (
              <div className="photo-item">
                <img src={photos.datingProfile} alt="Dating profile" />
                <button
                  type="button"
                  className="remove-photo"
                  onClick={() => removePhoto('datingProfile')}
                >
                  ×
                </button>
              </div>
            ) : (
              <div 
                className={`upload-placeholder ${uploading.datingProfile ? 'uploading' : ''}`}
                onClick={() => datingInputRef.current?.click()}
              >
                {uploading.datingProfile ? (
                  <div className="upload-progress">
                    <div className="spinner"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">💕</div>
                    <span>Add dating profile</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <input
            ref={datingInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files, 'datingProfile')}
          />
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button 
          type="button" 
          onClick={onNext} 
          className="btn-primary"
          disabled={!canProceed}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
