// TikTok Content Configuration
// Edit this file to create different profiles for your TikTok content

export const TIKTOK_PROFILES = {
  // Default profile
  default: {
    full_name: 'Alex Johnson',
    bio: 'Adventure seeker, coffee enthusiast, and dog lover. Looking for someone to explore the city with!',
    age: 28,
    location: 'San Francisco, CA',
    occupation: 'Software Engineer',
    education: 'Stanford University',
    height: '5\'8"',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop',
        caption: 'Hiking in Yosemite'
      },
      {
        url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=600&fit=crop',
        caption: 'Coffee shop vibes'
      },
      {
        url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=600&fit=crop',
        caption: 'With my dog Max'
      }
    ],
    prompts: [
      {
        category: 'About me',
        question: 'My simple pleasures.',
        answer: 'Morning coffee, sunset walks, and finding new bookstores.'
      },
      {
        category: 'Getting personal',
        question: 'My love language is.',
        answer: 'Quality time and words of affirmation. I love deep conversations over good food.'
      },
      {
        category: 'Story time',
        question: 'Most spontaneous thing I\'ve done.',
        answer: 'Booked a one-way ticket to Japan with just a backpack. Best decision ever!'
      }
    ]
  },

  // Funny/quirky profile for comedy content
  funny: {
    full_name: 'Sam Wilson',
    bio: 'Professional overthinker, amateur chef, and certified weirdo. Swipe right if you can handle my dad jokes!',
    age: 26,
    location: 'Austin, TX',
    occupation: 'Graphic Designer',
    education: 'Art Institute',
    height: '5\'6"',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
        caption: 'My attempt at cooking'
      },
      {
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
        caption: 'Caught mid-dad joke'
      }
    ],
    prompts: [
      {
        category: 'About me',
        question: 'My simple pleasures.',
        answer: 'Making terrible puns, eating cereal for dinner, and pretending I know how to cook.'
      },
      {
        category: 'Getting personal',
        question: 'Don\'t hate me if I',
        answer: 'Send you memes at 3 AM or quote movies in everyday conversation.'
      },
      {
        category: 'Story time',
        question: 'Worst idea I\'ve ever had.',
        answer: 'Trying to make my own sourdough starter. It\'s been 6 months and I\'m still not sure if it\'s alive.'
      }
    ]
  },

  // Successful/ambitious profile
  ambitious: {
    full_name: 'Jordan Chen',
    bio: 'Entrepreneur, fitness enthusiast, and world traveler. Building the future one startup at a time.',
    age: 32,
    location: 'New York, NY',
    occupation: 'Tech Founder',
    education: 'MIT',
    height: '6\'0"',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop',
        caption: 'Speaking at TechCrunch'
      },
      {
        url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop',
        caption: 'Morning workout'
      }
    ],
    prompts: [
      {
        category: 'About me',
        question: 'My greatest strength.',
        answer: 'Turning impossible ideas into reality. Also, I make a mean avocado toast.'
      },
      {
        category: 'Getting personal',
        question: 'I geek out on.',
        answer: 'Productivity hacks, sustainable investing, and finding the perfect coffee-to-milk ratio.'
      },
      {
        category: 'My type',
        question: 'Green flags I look for.',
        answer: 'Ambition, kindness, and someone who doesn\'t mind that I check my phone during dinner.'
      }
    ]
  },

  // Creative/artsy profile
  creative: {
    full_name: 'River Martinez',
    bio: 'Artist, musician, and professional daydreamer. Let\'s create something beautiful together.',
    age: 24,
    location: 'Portland, OR',
    occupation: 'Freelance Artist',
    education: 'Art School',
    height: '5\'4"',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=600&fit=crop',
        caption: 'In my studio'
      },
      {
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
        caption: 'Street art session'
      }
    ],
    prompts: [
      {
        category: 'About me',
        question: 'I go crazy for.',
        answer: 'Sunset colors, vinyl records, and people who aren\'t afraid to be weird.'
      },
      {
        category: 'Getting personal',
        question: 'The key to my heart is.',
        answer: 'Supporting my art, dancing in the kitchen, and understanding that I need alone time to create.'
      },
      {
        category: 'Your world',
        question: 'I\'m in my element when',
        answer: 'I\'m painting at 2 AM, discovering new music, or having deep conversations about life.'
      }
    ]
  }
};

// Easy way to switch between profiles
export const CURRENT_PROFILE = 'default'; // Change this to 'funny', 'ambitious', or 'creative'
