'use client';

import React, { useState, useRef } from 'react';

type Photos = {
  outfits: string[];
  roomTourPhotos: string[];
  datingProfileScreenshots: string[];
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

  const handleFileUpload = async (files: FileList | null, category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', isMultiple: boolean = false) => {
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
        } else if (category === 'datingProfileScreenshots') {
          onPhotosChange({ ...photos, datingProfileScreenshots: [...photos.datingProfileScreenshots, ...urls] });
        }
      } else {
        const url = await uploadToSupabase(files[0], category);
        if (category === 'outfits') {
          onPhotosChange({ ...photos, outfits: [...photos.outfits, url] });
        } else if (category === 'roomTourPhotos') {
          onPhotosChange({ ...photos, roomTourPhotos: [...photos.roomTourPhotos, url] });
        } else if (category === 'datingProfileScreenshots') {
          onPhotosChange({ ...photos, datingProfileScreenshots: [...photos.datingProfileScreenshots, url] });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [category]: false }));
      setUploadProgress(prev => ({ ...prev, [category]: 0 }));
    }
  };

  const removePhoto = (category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', index: number) => {
    if (category === 'outfits') {
      const newOutfits = photos.outfits.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, outfits: newOutfits });
    } else if (category === 'roomTourPhotos') {
      const newRoomPhotos = photos.roomTourPhotos.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, roomTourPhotos: newRoomPhotos });
    } else if (category === 'datingProfileScreenshots') {
      const newDating = photos.datingProfileScreenshots.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, datingProfileScreenshots: newDating });
    }
  };

  // All optional now
  const canProceed = true;

  return (
    <div className="photo-upload">
      <div className="step-header">
        <h2>Upload Your Photos</h2>
        <p>All photo uploads are optional. Add up to 3 outfit photos, 3 room photos, and 10 dating profile screenshots.</p>
      </div>

      <div className="upload-sections">
        {/* Outfits Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Outfit Photos</h3>
            <p>Up to 3 full-body photos showing your style (optional)</p>
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
            
            {photos.outfits.length < 3 && (
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
                  <span>Add outfit photo ({3 - photos.outfits.length} left)</span>
                </>
              )}
              </div>
            )}
          </div>
          
          <input
            ref={outfitsInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              const remaining = 3 - photos.outfits.length;
              const limited = Array.from(files).slice(0, Math.max(0, remaining));
              const dataTransfer = new DataTransfer();
              limited.forEach(f => dataTransfer.items.add(f));
              handleFileUpload(dataTransfer.files, 'outfits', true);
              e.currentTarget.value = '';
            }}
          />
        </div>

        {/* Room Tour Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Room Tour Photos</h3>
            <p>Up to 3 photos of your living space (optional)</p>
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
            
            {photos.roomTourPhotos.length < 3 && (
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
                  <span>Add room photo ({3 - photos.roomTourPhotos.length} left)</span>
                </>
              )}
              </div>
            )}
          </div>
          
          <input
            ref={roomInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              const remaining = 3 - photos.roomTourPhotos.length;
              const limited = Array.from(files).slice(0, Math.max(0, remaining));
              const dataTransfer = new DataTransfer();
              limited.forEach(f => dataTransfer.items.add(f));
              handleFileUpload(dataTransfer.files, 'roomTourPhotos', true);
              e.currentTarget.value = '';
            }}
          />
        </div>

        {/* Dating Profile Screenshots Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Dating Profile Screenshots</h3>
            <p>Up to 10 screenshots from your dating profile (optional)</p>
          </div>
          
          <div className="photo-grid">
            {photos.datingProfileScreenshots.map((shot, index) => (
              <div key={index} className="photo-item">
                <img src={shot} alt={`Dating profile ${index + 1}`} />
                <button
                  type="button"
                  className="remove-photo"
                  onClick={() => removePhoto('datingProfileScreenshots', index)}
                >
                  ×
                </button>
              </div>
            ))}
            {photos.datingProfileScreenshots.length < 10 && (
              <div 
                className={`upload-placeholder ${uploading.datingProfileScreenshots ? 'uploading' : ''}`}
                onClick={() => datingInputRef.current?.click()}
              >
                {uploading.datingProfileScreenshots ? (
                  <div className="upload-progress">
                    <div className="spinner"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">💕</div>
                    <span>Add screenshot ({10 - photos.datingProfileScreenshots.length} left)</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <input
            ref={datingInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              const remaining = 10 - photos.datingProfileScreenshots.length;
              const limited = Array.from(files).slice(0, Math.max(0, remaining));
              const dataTransfer = new DataTransfer();
              limited.forEach(f => dataTransfer.items.add(f));
              handleFileUpload(dataTransfer.files, 'datingProfileScreenshots', true);
              e.currentTarget.value = '';
            }}
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
