'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CROP_SIZE = 200; // Size of the circular crop area
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // Reset position and scale when new image is loaded
  useEffect(() => {
    if (imageFile) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setImageLoaded(false);
    }
  }, [imageFile]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
    }
  }, []);

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    
    setPosition(newPosition);
    e.preventDefault();
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.1, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.1, MIN_SCALE));
  }, []);

  // Handle rotation
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Generate cropped image
  const handleCrop = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate image position and size for cropping
    const image = imageRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate the actual image dimensions after scaling
    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;

    // Calculate the offset from the container center
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    const imageCenterX = containerCenterX + position.x;
    const imageCenterY = containerCenterY + position.y;

    // Calculate the source rectangle in the original image
    const sourceX = (imageCenterX - CROP_SIZE / 2 - (containerCenterX - scaledWidth / 2)) / scale;
    const sourceY = (imageCenterY - CROP_SIZE / 2 - (containerCenterY - scaledHeight / 2)) / scale;
    const sourceWidth = CROP_SIZE / scale;
    const sourceHeight = CROP_SIZE / scale;

    // Apply rotation
    if (rotation !== 0) {
      ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-CROP_SIZE / 2, -CROP_SIZE / 2);
    }

    // Draw the cropped portion
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, CROP_SIZE, CROP_SIZE
    );

    // Convert canvas to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, { 
          type: imageFile.type,
          lastModified: Date.now()
        });
        onCrop(croppedFile);
      }
    }, imageFile.type, 0.9);
  }, [imageFile, scale, position, rotation, onCrop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Crop Your Photo</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Crop Area */}
          <div className="relative">
            <div
              ref={containerRef}
              className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden"
              style={{ width: CROP_SIZE, height: CROP_SIZE, margin: '0 auto' }}
            >
              {/* Circular crop overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, transparent 0%, transparent ${CROP_SIZE/2 - 2}px, rgba(0,0,0,0.5) ${CROP_SIZE/2}px)`,
                  borderRadius: '50%',
                  border: '2px solid #fff'
                }}
              />
              
              {/* Image */}
              {imageFile && (
                <img
                  ref={imageRef}
                  src={URL.createObjectURL(imageFile)}
                  alt="Crop preview"
                  className="absolute"
                  style={{
                    width: imageSize.width * scale,
                    height: imageSize.height * scale,
                    left: `calc(50% + ${position.x}px)`,
                    top: `calc(50% + ${position.y}px)`,
                    transform: 'translate(-50%, -50%)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transformOrigin: 'center',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    display: imageLoaded ? 'block' : 'none'
                  }}
                  onLoad={handleImageLoad}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              )}
              
              {/* Loading indicator */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600">
            <p className="flex items-center justify-center gap-2 mb-2">
              <Move className="h-4 w-4" />
              Drag to position
            </p>
            <p>Use zoom and rotate to adjust your photo</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              className="flex-1"
              disabled={!imageLoaded}
            >
              Use Photo
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden canvas for cropping */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}
