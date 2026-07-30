'use client';

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, RotateCw } from 'lucide-react';

interface CircularCropModalProps {
  imageFile: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function CircularCropModal({ 
  imageFile, 
  onCrop, 
  onCancel, 
  isOpen 
}: CircularCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  // Portals require the DOM; only render after mount to stay SSR-safe.
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset crop position when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen]);

  // Lock background scroll while the modal is open.
  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    const { x, y, width, height } = pixelCrop;

    // Calculate the size needed to accommodate rotation
    const maxSize = Math.max(image.width, image.height);
    const safeArea = rotation !== 0 ? 2 * ((maxSize / 2) * Math.sqrt(2)) : Math.max(image.width, image.height);

    // Set canvas to final crop size
    canvas.width = width;
    canvas.height = height;

    if (rotation !== 0) {
      // Create a temporary canvas for rotation
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('No 2d context for temp canvas');
      }

      tempCanvas.width = safeArea;
      tempCanvas.height = safeArea;
      tempCtx.imageSmoothingEnabled = true;
      (tempCtx as any).imageSmoothingQuality = 'high';

      // Draw rotated image centered on temp canvas
      tempCtx.translate(safeArea / 2, safeArea / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.translate(-safeArea / 2, -safeArea / 2);
      tempCtx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
      );

      // Calculate the position of the original image on the rotated canvas
      const imageX = safeArea / 2 - image.width * 0.5;
      const imageY = safeArea / 2 - image.height * 0.5;

      // The pixelCrop coordinates are relative to the original image
      // Map them to the rotated canvas
      const cropX = imageX + x;
      const cropY = imageY + y;

      // Draw the cropped portion
      ctx.drawImage(
        tempCanvas,
        cropX,
        cropY,
        width,
        height,
        0,
        0,
        width,
        height
      );
    } else {
      // No rotation - direct crop
      ctx.drawImage(
        image,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      );
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob as Blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels || !imageFile) return;

    try {
      const imageSrc = URL.createObjectURL(imageFile);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      
      const croppedFile = new File([croppedImage], imageFile.name, { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      onCrop(croppedFile);
      URL.revokeObjectURL(imageSrc);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 md:p-4" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <Card className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden border-white/20 bg-background md:max-h-[85vh]">
        <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 px-3 pb-2 pt-3 md:px-4 md:pb-3 md:pt-4">
          <CardTitle className="text-sm md:text-base font-semibold text-white">Crop Your Photo</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 w-7 md:h-8 md:w-8 p-0 text-white hover:bg-white/10 active:bg-white/20"
          >
            <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </CardHeader>

        {/* Scrollable region: crop + controls. Keeps the footer buttons always visible. */}
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto px-3 pb-2 md:space-y-3 md:px-4">
          {/* Crop Area */}
          <div className="relative bg-black/50 rounded-lg overflow-hidden flex-shrink-0" style={{ touchAction: 'none', height: 'min(40vh, 280px)', minHeight: '180px', maxHeight: '320px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Cropper
                image={URL.createObjectURL(imageFile)}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                restrictPosition={true}
                zoomWithScroll={false}
                minZoom={1}
                maxZoom={3}
                onCropChange={onCropChange}
                onCropComplete={onCropAreaChange}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2 flex-shrink-0">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/75">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/75">Rotation</label>
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/85 active:opacity-70"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>90°</span>
                </button>
              </div>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </CardContent>

        {/* Pinned footer — always visible even on short laptop-landscape viewports */}
        <div className="flex flex-shrink-0 gap-2 border-t border-white/10 px-3 pb-3 pt-2 md:px-4 md:pb-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-10 bg-transparent border-white/20 text-white hover:bg-white/10 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCrop}
            className="h-10 flex-1 text-sm font-medium"
          >
            Use Photo
          </Button>
        </div>
      </Card>

      <style jsx global>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #F26955;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(242, 105, 85, 0.45);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #F26955;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(242, 105, 85, 0.45);
        }

        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 12px rgba(242, 105, 85, 0.6);
        }

        .slider::-moz-range-thumb:hover {
          box-shadow: 0 2px 12px rgba(242, 105, 85, 0.6);
        }

        /* Ensure crop area is centered and visible */
        .reactEasyCrop_Container {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* Ensure the crop area ring is visible and centered */
        .reactEasyCrop_CropArea {
          z-index: 100 !important;
        }
        
        /* Ensure the image is below the crop area */
        .reactEasyCrop_Image {
          z-index: 1 !important;
        }
      `}</style>
    </div>,
    document.body
  );
}
