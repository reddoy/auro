'use client';

import React, { useState, useCallback } from 'react';
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

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    // Improve rendering on mobile by enabling high-quality smoothing
    // and promoting layer stability during transforms
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 md:p-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <Card className="w-full max-w-md bg-gradient-to-br from-[#0c0325] to-[#1a0b3d] border-white/20 max-h-[95vh] md:max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4 px-4 pt-4 flex-shrink-0">
          <CardTitle className="text-base md:text-lg font-semibold text-white">Crop Your Photo</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 text-white hover:bg-white/10 active:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pb-4">
          {/* Crop Area */}
          <div className="relative bg-black/50 rounded-lg overflow-hidden flex-shrink-0" style={{ touchAction: 'none', height: 'min(50vh, 350px)', minHeight: '250px', maxHeight: '400px', isolation: 'isolate' }}>
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
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  // Prevent browser pinch-zoom conflicts with crop gestures on mobile
                  touchAction: 'none',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  isolation: 'isolate'
                },
                cropAreaStyle: {
                  border: '3px solid #fff',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.5), 0 0 0 4px rgba(255,255,255,0.3)',
                  zIndex: 100,
                  position: 'relative'
                },
                mediaStyle: {
                  maxWidth: 'none',
                  willChange: 'transform',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  zIndex: 1
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3 flex-shrink-0">
            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-gray-300">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs md:text-sm font-medium text-gray-300">Rotation</label>
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 active:opacity-70"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rotate 90°</span>
                  <span className="sm:hidden">90°</span>
                </button>
              </div>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs md:text-sm text-gray-300 flex-shrink-0">
            <p>Drag to position, use zoom and rotate to adjust</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-11 bg-transparent border-white/20 text-white hover:bg-white/10 text-base font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white text-base font-medium"
            >
              Use Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6f00, #9333ea);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 111, 0, 0.4);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6f00, #9333ea);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(255, 111, 0, 0.4);
        }

        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 12px rgba(255, 111, 0, 0.6);
        }

        .slider::-moz-range-thumb:hover {
          box-shadow: 0 2px 12px rgba(255, 111, 0, 0.6);
        }

        /* Ensure crop area is always visible on top */
        [data-testid="crop-container"] > div:last-child {
          z-index: 100 !important;
        }
        
        /* Ensure the crop area ring is visible */
        .reactEasyCrop_CropArea {
          z-index: 100 !important;
          position: relative !important;
        }
        
        /* Ensure the image is below the crop area */
        .reactEasyCrop_Image {
          z-index: 1 !important;
        }
      `}</style>
    </div>
  );
}
