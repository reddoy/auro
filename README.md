# Auro - Get Reviewed by Influencer Women

Auro is a mobile app where men can sign up to get reviewed by popular influencer women on their attractiveness, wardrobe, and room setup to receive feedback on how to improve.

## Features

### ⭐ My Reviews
- Track your review requests and statuses
- View detailed feedback with ratings out of 10

### 👤 Profile Management
- User profile with stats
- Track completed reviews and average ratings
- View review history

### 📱 Modern Mobile UI
- Clean, modern design
- Smooth navigation with Expo Router
- Tab-based navigation
- Image upload functionality

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Language**: TypeScript
- **Image Handling**: Expo Image Picker
- **State Management**: React Hooks
- **Styling**: React Native StyleSheet

## Project Structure

```
auro/
├── app/                    # App screens using Expo Router
│   ├── (tabs)/            # Tab navigator screens
│   │   ├── requests.tsx   # My reviews
│   │   ├── profile.tsx    # User profile
│   ├── auth.tsx           # Authentication screen
│   ├── request-review.tsx # Review request form
│   └── review/[id].tsx    # Review detail screen
├── components/            # Reusable components
├── constants/             # App constants and themes
├── data/                  # Mock data for testing
│   └── mockData.ts
├── types/                 # TypeScript type definitions
│   └── index.ts
└── assets/               # Images and fonts
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Test on Expo Go**
   - Install Expo Go on your iOS/Android device
   - Scan the QR code from the terminal

## Mock Data

The app includes comprehensive mock data:

- **4 Influencers** with different specialties and pricing
- **Sample reviews** with detailed feedback
- **Review requests** in various states
- **Photo categories** with upload requirements

## Key Features Implemented

✅ **Navigation Setup** - Tab and stack navigation with Expo Router  
✅ **Reviews Tab** - Track submitted reviews  
✅ **Review Request Flow** - Complete photo upload and submission  
✅ **Review Viewing** - Detailed feedback with ratings  
✅ **Profile Management** - User stats and settings  
✅ **Authentication** - Login/signup screens  
✅ **Modern UI/UX** - Professional design with shadows and animations  

## Screenshots

The app features:
- **Reviews Tab**: List of your review requests with status tracking
- **Profile Tab**: Personal stats, bio, and account settings
- **Review Request**: Photo upload by category with influencer selection
- **Review Detail**: Comprehensive feedback with ratings breakdown

## Next Steps

Future enhancements could include:
- Real backend integration
- Payment processing
- Push notifications
- Chat functionality
- Video reviews
- Social features

---

Built with ❤️ using React Native and Expo
