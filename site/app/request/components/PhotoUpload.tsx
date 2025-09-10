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
  uploadSessionId?: string;
};

export default function PhotoUpload({ photos, onPhotosChange, onNext, onBack, supabase, uploadSessionId }: Props) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [localPreviews, setLocalPreviews] = useState<{
    outfits: string[];
    roomTourPhotos: string[];
    datingProfileScreenshots: string[];
  }>({ outfits: [], roomTourPhotos: [], datingProfileScreenshots: [] });
  
  const outfitsInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const datingInputRef = useRef<HTMLInputElement>(null);
  const isHeicLike = (file: File) => {
    const name = (file.name || '').toLowerCase();
    return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
  };

  const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      } catch (e) { reject(e); }
    });
  };

  const reencodeToJpeg = async (file: File): Promise<Blob> => {
    const img = await loadImageFromBlob(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))), 'image/jpeg', 0.9);
    });
    return blob;
  };

  const convertToJpeg = async (file: File): Promise<{ uploadFile: File; previewBlob: Blob }> => {
    try {
      if (isHeicLike(file)) {
        const mod = await import('heic2any');
        const heic2any: any = (mod as any).default || mod;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        const jpegBlob: Blob = Array.isArray(converted) ? converted[0] : converted;
        const jpegFile = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        return { uploadFile: jpegFile, previewBlob: jpegBlob };
      }
      // Always convert any image to JPEG via canvas
      const jpegBlob = await reencodeToJpeg(file);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const jpegFile = new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
      return { uploadFile: jpegFile, previewBlob: jpegBlob };
    } catch {
      // Fallback to original file if conversion fails
      return { uploadFile: file, previewBlob: file };
    }
  };

  const addLocalPreviews = (category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', blobs: Blob[]) => {
    const urls = blobs.map(b => URL.createObjectURL(b));
    setLocalPreviews(prev => ({
      ...prev,
      [category]: [...prev[category], ...urls]
    }));
    return urls;
  };

  const removeLocalPreviewAt = (category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', index: number) => {
    setLocalPreviews(prev => {
      const arr = [...prev[category]];
      const [removed] = arr.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed);
      return { ...prev, [category]: arr } as typeof prev;
    });
  };

  React.useEffect(() => {
    return () => {
      try {
        localPreviews.outfits.forEach(u => URL.revokeObjectURL(u));
        localPreviews.roomTourPhotos.forEach(u => URL.revokeObjectURL(u));
        localPreviews.datingProfileScreenshots.forEach(u => URL.revokeObjectURL(u));
      } catch {}
    };
  }, []);

  const uploadToSupabase = async (file: File, category: string): Promise<string> => {
    setUploadProgress(prev => ({ ...prev, [category]: 0 }));

    // Ask server for a signed upload URL
    const contentType = file.type || 'application/octet-stream';
    const res = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType, category, uploadSessionId })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to get signed URL: ${msg}`);
    }
    const { signedUrl, path, bucket, token } = await res.json();

    // Upload using Supabase helper with token
    const { error: uploadErr } = await supabase.storage
      .from(bucket || 'request-media')
      .uploadToSignedUrl(path, token, file, { contentType });
    if (uploadErr) {
      throw new Error(`Signed upload failed: ${uploadErr.message}`);
    }

    // Create short-lived signed URL for display
    // Ask server to sign a view URL to avoid client storage perms
    const viewRes = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'sign-view', path, expiresIn: 60 * 60 * 24 })
    });
    if (!viewRes.ok) {
      const errText = await viewRes.text();
      throw new Error(`Failed to sign view URL: ${errText}`);
    }
    const viewJson = await viewRes.json();
    const signedViewUrl = viewJson?.signedUrl as string;

    setUploadProgress(prev => ({ ...prev, [category]: 100 }));
    return signedViewUrl || '';
  };

  const handleFileUpload = async (files: FileList | null, category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', isMultiple: boolean = false) => {
    if (!files || files.length === 0) return;

    setUploading(prev => ({ ...prev, [category]: true }));

    try {
      if (isMultiple) {
        const prepared = await Promise.all(Array.from(files).map(async (file) => {
          const { uploadFile, previewBlob } = await convertToJpeg(file);
          return { uploadFile, previewBlob };
        }));
        addLocalPreviews(category, prepared.map(p => p.previewBlob));
        const uploadPromises = prepared.map((p, index) => uploadToSupabase(p.uploadFile, `${category}_${index}`));
        const urls = await Promise.all(uploadPromises);
        
        if (category === 'outfits') {
          onPhotosChange({ ...photos, outfits: [...photos.outfits, ...urls] });
          // remove the number of previews we just fulfilled
          for (let i = 0; i < urls.length; i++) removeLocalPreviewAt('outfits', 0);
        } else if (category === 'roomTourPhotos') {
          onPhotosChange({ ...photos, roomTourPhotos: [...photos.roomTourPhotos, ...urls] });
          for (let i = 0; i < urls.length; i++) removeLocalPreviewAt('roomTourPhotos', 0);
        } else if (category === 'datingProfileScreenshots') {
          onPhotosChange({ ...photos, datingProfileScreenshots: [...photos.datingProfileScreenshots, ...urls] });
          for (let i = 0; i < urls.length; i++) removeLocalPreviewAt('datingProfileScreenshots', 0);
        }
      } else {
        const { uploadFile, previewBlob } = await convertToJpeg(files[0]);
        addLocalPreviews(category, [previewBlob]);
        const url = await uploadToSupabase(uploadFile, category);
        if (category === 'outfits') {
          onPhotosChange({ ...photos, outfits: [...photos.outfits, url] });
          removeLocalPreviewAt('outfits', 0);
        } else if (category === 'roomTourPhotos') {
          onPhotosChange({ ...photos, roomTourPhotos: [...photos.roomTourPhotos, url] });
          removeLocalPreviewAt('roomTourPhotos', 0);
        } else if (category === 'datingProfileScreenshots') {
          onPhotosChange({ ...photos, datingProfileScreenshots: [...photos.datingProfileScreenshots, url] });
          removeLocalPreviewAt('datingProfileScreenshots', 0);
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
      removeLocalPreviewAt('outfits', index);
    } else if (category === 'roomTourPhotos') {
      const newRoomPhotos = photos.roomTourPhotos.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, roomTourPhotos: newRoomPhotos });
      removeLocalPreviewAt('roomTourPhotos', index);
    } else if (category === 'datingProfileScreenshots') {
      const newDating = photos.datingProfileScreenshots.filter((_, i) => i !== index);
      onPhotosChange({ ...photos, datingProfileScreenshots: newDating });
      removeLocalPreviewAt('datingProfileScreenshots', index);
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
            {localPreviews.outfits.map((preview, index) => (
              <div key={`preview-outfit-${index}`} className="photo-item">
                <img src={preview} alt={`Uploading outfit ${index + 1}`} />
                <div className="upload-progress" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 12 }}>
                  <div className="spinner"></div>
                </div>
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
            {localPreviews.roomTourPhotos.map((preview, index) => (
              <div key={`preview-room-${index}`} className="photo-item">
                <img src={preview} alt={`Uploading room ${index + 1}`} />
                <div className="upload-progress" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 12 }}>
                  <div className="spinner"></div>
                </div>
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
            {localPreviews.datingProfileScreenshots.map((preview, index) => (
              <div key={`preview-dating-${index}`} className="photo-item">
                <img src={preview} alt={`Uploading screenshot ${index + 1}`} />
                <div className="upload-progress" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 12 }}>
                  <div className="spinner"></div>
                </div>
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
