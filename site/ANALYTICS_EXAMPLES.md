# Google Analytics Usage Examples

Here are practical examples of how to use Google Analytics tracking in your Auro site components.

## Example 1: Track Button Clicks

```tsx
'use client';

import { event } from '@/lib/analytics';

export default function BecomeReviewerButton() {
  const handleClick = () => {
    // Track the button click
    event({
      action: 'click',
      category: 'CTA',
      label: 'Become a Reviewer Button',
    });

    // Your existing button logic...
    window.location.href = '/reviewers/apply';
  };

  return (
    <button onClick={handleClick}>
      Become a Reviewer
    </button>
  );
}
```

## Example 2: Track Form Submissions

```tsx
'use client';

import { event } from '@/lib/analytics';

export default function WaitlistForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Your form submission logic...
      await submitToWaitlist();
      
      // Track successful submission
      event({
        action: 'submit',
        category: 'Form',
        label: 'Waitlist Signup',
      });
    } catch (error) {
      // Track errors too!
      event({
        action: 'error',
        category: 'Form',
        label: 'Waitlist Signup Failed',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
    </form>
  );
}
```

## Example 3: Track Outbound Links

```tsx
'use client';

import { event } from '@/lib/analytics';

export default function SocialLinks() {
  const trackSocialClick = (platform: string) => {
    event({
      action: 'click',
      category: 'Social Media',
      label: platform,
    });
  };

  return (
    <div>
      <a 
        href="https://instagram.com/yourprofile" 
        onClick={() => trackSocialClick('Instagram')}
        target="_blank"
        rel="noopener noreferrer"
      >
        Instagram
      </a>
      <a 
        href="https://tiktok.com/@yourprofile" 
        onClick={() => trackSocialClick('TikTok')}
        target="_blank"
        rel="noopener noreferrer"
      >
        TikTok
      </a>
    </div>
  );
}
```

## Example 4: Track E-commerce Events

```tsx
'use client';

import { event } from '@/lib/analytics';

export default function CheckoutButton({ amount, reviewerId }: { amount: number, reviewerId: string }) {
  const handlePurchase = async () => {
    try {
      const result = await createCheckoutSession();
      
      // Track purchase initiation
      event({
        action: 'begin_checkout',
        category: 'Ecommerce',
        label: `Reviewer: ${reviewerId}`,
        value: amount,
      });
      
      window.location.href = result.url;
    } catch (error) {
      event({
        action: 'checkout_error',
        category: 'Ecommerce',
        label: 'Payment Failed',
      });
    }
  };

  return <button onClick={handlePurchase}>Request Review - ${amount}</button>;
}
```

## Example 5: Track Video Plays

```tsx
'use client';

import { event } from '@/lib/analytics';
import { useRef } from 'react';

export default function VideoReview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    event({
      action: 'play',
      category: 'Video',
      label: 'Review Demo Video',
    });
  };

  const handleComplete = () => {
    event({
      action: 'complete',
      category: 'Video',
      label: 'Review Demo Video',
    });
  };

  return (
    <video
      ref={videoRef}
      onPlay={handlePlay}
      onEnded={handleComplete}
      controls
    >
      <source src="/demo.mp4" type="video/mp4" />
    </video>
  );
}
```

## Example 6: Track User Engagement Time

```tsx
'use client';

import { event } from '@/lib/analytics';
import { useEffect, useRef } from 'react';

export default function ReviewerProfile({ reviewerId }: { reviewerId: string }) {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    return () => {
      // Track how long user viewed this profile
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      
      if (timeSpent > 5) { // Only track if they spent more than 5 seconds
        event({
          action: 'engagement',
          category: 'Profile View',
          label: reviewerId,
          value: timeSpent,
        });
      }
    };
  }, [reviewerId]);

  return (
    <div>
      {/* Your profile content */}
    </div>
  );
}
```

## Example 7: Track Search Queries

```tsx
'use client';

import { event } from '@/lib/analytics';
import { useState } from 'react';

export default function ReviewerSearch() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    event({
      action: 'search',
      category: 'Site Search',
      label: query,
    });

    // Perform search...
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search reviewers..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

## Example 8: Track Signup Funnel Steps

```tsx
'use client';

import { event } from '@/lib/analytics';

export default function SignupFlow() {
  const trackStep = (stepName: string) => {
    event({
      action: 'funnel_step',
      category: 'Signup',
      label: stepName,
    });
  };

  return (
    <div>
      <button onClick={() => {
        trackStep('Step 1: Email Entered');
        // Move to next step...
      }}>
        Continue
      </button>
      
      <button onClick={() => {
        trackStep('Step 2: Profile Created');
        // Move to next step...
      }}>
        Next
      </button>
      
      <button onClick={() => {
        trackStep('Step 3: Signup Complete');
        // Complete signup...
      }}>
        Finish
      </button>
    </div>
  );
}
```

## Common Event Categories to Use

- **CTA** - Call-to-action buttons
- **Navigation** - Menu clicks, page navigation
- **Form** - Form submissions, field interactions
- **Social Media** - Social media link clicks
- **Ecommerce** - Purchase events, cart actions
- **Video** - Video plays, pauses, completions
- **Engagement** - Time on page, scroll depth
- **Search** - Site search queries
- **Signup** - Registration funnel steps
- **Error** - Error messages, failed actions

## Recommended Events to Track for Auro

Based on your site structure, here are the most valuable events to track:

1. **Homepage CTA clicks** - "Become a Reviewer" button
2. **Reviewer profile views** - Track which reviewers are most popular
3. **Request review button clicks** - See conversion intent
4. **Checkout initiations** - Track purchase funnel
5. **Application form submissions** - Reviewer applications
6. **Social media link clicks** - See which platforms drive engagement
7. **Video demo plays** - Track video engagement
8. **Waitlist signups** - Pre-launch interest
9. **Share button clicks** - Track viral sharing
10. **Creator profile requests** - See which creators get requests

Start with these core events and add more as needed!

