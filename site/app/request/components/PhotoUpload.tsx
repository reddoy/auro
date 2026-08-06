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

  function StoredPhoto({
    pathOrUrl,
    alt,
    onRemove,
  }: {
    pathOrUrl: string;
    alt: string;
    onRemove: () => void;
  }) {
    const [src, setSrc] = React.useState<string | null>(null);

    React.useEffect(() => {
      let cancelled = false;
      void (async () => {
        if (/^https?:\/\//i.test(pathOrUrl)) {
          if (!cancelled) setSrc(pathOrUrl);
          return;
        }
        const params = new URLSearchParams({
          path: pathOrUrl.replace(/^\/+/, ''),
          expiresIn: '3600',
        });
        try {
          const res = await fetch(`/api/storage/signed-view?${params.toString()}`);
          if (!res.ok) return;
          const json = await res.json();
          if (!cancelled) setSrc((json?.url as string) || null);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [pathOrUrl]);

    return (
      <div className="photo-item">
        {src ? (
          <img src={src} alt={alt} />
        ) : (
          <div className="upload-progress" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
            <div className="spinner"></div>
          </div>
        )}
        <button type="button" className="remove-photo" onClick={onRemove}>
          ×
        </button>
      </div>
    );
  }

  const uploadToSupabase = async (file: File, category: string): Promise<string> => {
    setUploadProgress(prev => ({ ...prev, [category]: 0 }));

    // Client-side file validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB. Please choose a smaller file.`);
    }
    
    // Check file type
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
    }
    
    const contentType = file.type || 'application/octet-stream';
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      throw new Error(`Invalid content type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Ask server for a signed upload URL
    const res = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType, category, uploadSessionId, fileSize: file.size })
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

    setUploadProgress(prev => ({ ...prev, [category]: 100 }));
    return path || '';
  };

  const handleFileUpload = async (files: FileList | null, category: 'outfits' | 'roomTourPhotos' | 'datingProfileScreenshots', isMultiple: boolean = false) => {
    if (!files || files.length === 0) return;

    // CRITICAL: File size validation - prevent oversized uploads
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total for all files
    
    const fileArray = Array.from(files);
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    
    // Check individual file sizes
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum file size is 10MB. Please compress or resize the image.`);
        return;
      }
    }
    
    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      alert(`Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum of 50MB. Please select fewer or smaller files.`);
      return;
    }

    setUploading(prev => ({ ...prev, [category]: true }));

    try {
      if (isMultiple) {
        const prepared = await Promise.all(fileArray.map(async (file) => {
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
        <h2>Upload Your Dating Profile Photos</h2>
        <p>Upload up to 10 photos from your dating profile (Hinge, Bumble, etc.) for personalized feedback and recommendations.</p>
      </div>

      <div className="upload-sections">
        {/* Dating Profile Screenshots Section */}
        <div className="upload-section">
          <div className="section-header">
            <h3>Dating Profile Photos</h3>
            <p>Upload your dating profile photos - up to 10 photos</p>
          </div>
          
          <div className="photo-grid">
            {photos.datingProfileScreenshots.map((shot, index) => (
              <StoredPhoto
                key={`${shot}-${index}`}
                pathOrUrl={shot}
                alt={`Dating profile ${index + 1}`}
                onRemove={() => removePhoto('datingProfileScreenshots', index)}
              />
            ))}
            {localPreviews.datingProfileScreenshots.map((preview, index) => (
              <div key={`preview-dating-${index}`} className="photo-item">
                <img src={preview} alt={`Uploading screenshot ${index + 1}`} />
                <div className="upload-progress" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 12 }}>
                  <div className="spinner"></div>
                </div>
              </div>
            ))}
            {photos.datingProfileScreenshots.length < 10 && localPreviews.datingProfileScreenshots.length === 0 && (
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
        <button 
          type="button" 
          onClick={onNext} 
          className="btn-primary"
          disabled={!canProceed}
        >
          Continue
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
