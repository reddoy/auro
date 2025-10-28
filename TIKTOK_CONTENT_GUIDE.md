# TikTok Hinge Profile Creator

Perfect for creating TikTok content about dating apps! This is a simplified Hinge-style profile that uses local storage and is super easy to customize.

## 🎬 How to Use for TikTok Content

### 1. **Quick Profile Switching**
Edit `site/app/c/[slug]/tiktok-profiles.ts` and change the `CURRENT_PROFILE` variable:

```typescript
export const CURRENT_PROFILE = 'funny'; // Options: 'default', 'funny', 'ambitious', 'creative'
```

### 2. **Available Profiles**
- **`default`**: Normal, well-rounded profile
- **`funny`**: Quirky, comedy-focused profile  
- **`ambitious`**: Successful, career-focused profile
- **`creative`**: Artsy, creative profile

### 3. **Customizing Profiles**
Edit the profile data in `tiktok-profiles.ts`:

```typescript
funny: {
  full_name: 'Sam Wilson',
  bio: 'Professional overthinker, amateur chef, and certified weirdo...',
  age: 26,
  location: 'Austin, TX',
  occupation: 'Graphic Designer',
  // ... add your own content
}
```

### 4. **Adding Photos**
Use Unsplash URLs for high-quality images:

```typescript
photos: [
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    caption: 'My attempt at cooking'
  }
]
```

### 5. **Creating Different Scenarios**
Perfect for TikTok content like:
- "Types of people on Hinge"
- "Red flags in dating profiles" 
- "Funny Hinge prompts"
- "Dating app fails"
- "Profile makeovers"

## 🚀 Getting Started

1. **View the profile**: Go to `https://app.appauro.com/profile/hinge-clone`
2. **Edit content**: Modify `tiktok-profiles.ts` 
3. **Take screenshots**: Use browser dev tools or screenshot tools
4. **Create content**: Use the profiles for your TikTok videos!

## 📱 Features

- **Mobile-optimized**: Perfect for phone screenshots
- **Realistic design**: Matches actual Hinge app
- **Easy editing**: Just change text in the config file
- **No database needed**: Everything stored locally
- **Multiple profiles**: Switch between different personas

## 🎨 Customization Tips

- **Photos**: Use Unsplash for free, high-quality images
- **Prompts**: Mix serious and funny answers
- **Names**: Use realistic but not real names
- **Locations**: Pick popular cities for relatability
- **Ages**: Use common dating app age ranges (24-35)

## 📸 Screenshot Tips

- Use browser dev tools to simulate mobile view
- Take screenshots at 375px width for best results
- Capture different sections (photos, prompts, bio)
- Use the like buttons for interactive content

Perfect for creating engaging TikTok content about dating apps! 🎉
