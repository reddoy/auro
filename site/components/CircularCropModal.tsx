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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-[#0c0325] to-[#1a0b3d] border-white/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-white">Crop Your Photo</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Crop Area */}
          <div className="relative h-64 bg-black/50 rounded-lg overflow-hidden">
            <Cropper
              image={URL.createObjectURL(imageFile)}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onCropComplete={onCropAreaChange}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                },
                cropAreaStyle: {
                  border: '3px solid #fff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
                },
                mediaStyle: {
                  maxWidth: 'none',
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Slider */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Zoom</label>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Rotation</label>
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300"
                >
                  <RotateCw className="w-4 h-4" />
                  Rotate 90°
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
          <div className="text-center text-sm text-gray-300">
            <p>Drag to position, use zoom and rotate to adjust your photo</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
            >
              Use Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
