# Profile Picture Crop Feature Setup

## Installation Required

You need to install the new dependency for the image cropping feature:

```bash
cd site
npm install react-easy-crop
```

## What Was Added

### 1. **New Dependency** (`package.json`)
- `react-easy-crop@5.0.8` - Professional image cropping library

### 2. **New Component** (`site/app/reviewers/apply/components/ImageCropModal.tsx`)
- Beautiful circular crop modal
- Zoom control
- Rotation control
- Real-time preview

### 3. **Updated Flow** (`site/app/reviewers/apply/page.tsx`)
- Photo selection → Crop modal appears
- User adjusts crop/zoom/rotation
- Click "Apply Crop"
- Cropped image saved as profile picture

## Features

✅ **Circular Crop** - Perfect circle shape for profile pictures  
✅ **Zoom In/Out** - Slider to adjust zoom level (1x to 3x)  
✅ **Rotation** - Slider for precise rotation (0° to 360°)  
✅ **90° Quick Rotate** - Button for quick rotation  
✅ **Live Preview** - See exactly what you're cropping  
✅ **Gradient UI** - Matches your brand colors  
✅ **Mobile Optimized** - Works great on phones

## User Experience

### Before:
```
Select Photo → Photo immediately set (no adjustment)
```

### After:
```
Select Photo → Crop Modal Opens
    ↓
Adjust crop, zoom, rotation
    ↓
Click "Apply Crop"
    ↓
Perfect circular profile picture!
```

## Modal Controls

1. **Drag** - Move the image around
2. **Pinch/Zoom** - On mobile, pinch to zoom
3. **Zoom Slider** - Precise zoom control
4. **Rotation Slider** - Adjust angle
5. **Rotate 90° Button** - Quick rotation
6. **Cancel** - Close without saving
7. **Apply Crop** - Save the cropped image

## Technical Details

- Output: JPEG format at 95% quality
- Aspect Ratio: 1:1 (perfect circle)
- Crop Shape: Round
- Max Zoom: 3x
- Rotation: 0° to 360°

---

**Next Step:** Run `npm install` in the `site` directory to install the dependency!

