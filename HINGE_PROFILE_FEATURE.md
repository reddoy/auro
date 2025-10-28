# TikTok Hinge Profile Creator

This is a simplified Hinge-style profile designed specifically for TikTok content creation. No database required - everything is stored locally and easily customizable!

## 🎬 Perfect for TikTok Content

This profile creator is ideal for creating TikTok content about:
- "Types of people on Hinge"
- "Red flags in dating profiles" 
- "Funny Hinge prompts"
- "Dating app fails"
- "Profile makeovers"
- "Dating app reviews"

## ✨ Features

### 📸 **Photo Gallery**
- Swipeable carousel with navigation arrows
- Photo captions and ordering
- Like functionality for individual photos
- High-quality Unsplash images included

### 💬 **Personality Prompts** 
- All 8 categories you requested:
  - About me, Getting personal, Story time
  - Let's chat about, My type, Self-care
  - Date vibes, Your world
- Interactive like buttons for each prompt
- Clean, card-based layout

### 👤 **Profile Information**
- Complete profile details (age, location, occupation, education, height)
- Bio section
- Dating preferences (age range, distance, relationship type)

### 🎨 **Easy Customization**
- **4 pre-built profiles**: default, funny, ambitious, creative
- **Simple switching**: Change one line of code to switch profiles
- **No database needed**: Everything stored in local files
- **Mobile-optimized**: Perfect for phone screenshots

## 🚀 Quick Start

### 1. **View the Profile**
Navigate to: `https://app.appauro.com/profile/hinge-clone`

### 2. **Switch Profiles**
Edit `site/app/c/[slug]/tiktok-profiles.ts`:
```typescript
export const CURRENT_PROFILE = 'funny'; // Options: 'default', 'funny', 'ambitious', 'creative'
```

### 3. **Customize Content**
Edit the profile data in the same file:
```typescript
funny: {
  full_name: 'Sam Wilson',
  bio: 'Professional overthinker, amateur chef, and certified weirdo...',
  age: 26,
  location: 'Austin, TX',
  // ... customize everything!
}
```

## 📁 **Files Structure**

```
site/app/c/[slug]/
├── HingeProfile.tsx          # Main profile component
├── tiktok-profiles.ts        # Easy-to-edit profile configurations
└── page.tsx                 # Routes to HingeProfile for hinge-clone

TIKTOK_CONTENT_GUIDE.md       # Complete TikTok content guide
```

## 🎯 **Available Profiles**

### **Default Profile**
- Well-rounded, realistic profile
- Good for general dating app content

### **Funny Profile** 
- Quirky, comedy-focused
- Perfect for "funny dating profiles" content

### **Ambitious Profile**
- Successful, career-focused
- Great for "types of people" content

### **Creative Profile**
- Artsy, creative personality
- Ideal for "creative dating profiles" content

## 📸 **Screenshot Tips**

- Use browser dev tools to simulate mobile view (375px width)
- Take screenshots of different sections (photos, prompts, bio)
- Use the like buttons for interactive content
- Capture the swipeable photo carousel

## 🔧 **Technical Details**

- **No Database**: Uses localStorage and static data
- **No API Calls**: Everything loads instantly
- **Mobile-First**: Optimized for phone screenshots
- **Realistic Design**: Matches actual Hinge app aesthetic
- **Easy Editing**: Just modify text files

## 🎬 **Content Ideas**

1. **"Types of People on Hinge"** - Switch between different profiles
2. **"Red Flags in Dating Profiles"** - Use the funny profile
3. **"Profile Makeover"** - Show before/after edits
4. **"Funny Hinge Prompts"** - Highlight quirky answers
5. **"Dating App Fails"** - Use creative scenarios

Perfect for creating engaging TikTok content about dating apps! 🎉
