'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { profileDisplayName } from '../../lib/profile-display-name';
import AsyncAvatar from '../../app/request/components/AsyncAvatar';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

type ReviewerProfile = {
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

type ReviewerTestimonial = {
  type: 'reviewer';
  username: string;
  fallbackName: string;
  quote: string;
  role: string;
};

type CustomerTestimonial = {
  type: 'customer';
  name: string;
  photo: string;
  quote: string;
  role: string;
};

type Testimonial = ReviewerTestimonial | CustomerTestimonial;

const TESTIMONIALS: Testimonial[] = [
  {
    type: 'reviewer',
    username: 'jennathiemann65',
    fallbackName: 'Jenna',
    quote:
      'So many guys are close to having solid profiles, they just need honest feedback. Auro makes it easy to help and get paid.',
    role: 'Reviewer',
  },
  {
    type: 'reviewer',
    username: 'khdrake10',
    fallbackName: 'Katie',
    quote:
      'Sometimes one tweak makes a huge difference in matches. I like that I can give direct feedback and get paid for it.',
    role: 'Reviewer',
  },
  {
    type: 'reviewer',
    username: 'aislinn306',
    fallbackName: 'Aislinn',
    quote:
      'Most profiles are one honest note away from working. I like that Auro keeps feedback direct and respectful — and that my time actually counts.',
    role: 'Reviewer',
  },
  {
    type: 'customer',
    name: 'Adam',
    photo: '/Adam_Testimonial.jpg',
    quote:
      "I finally understood why my photos weren't landing. One review pointed out what I was missing, and my matches picked up within a week.",
    role: 'Member',
  },
  {
    type: 'customer',
    name: 'Liam',
    photo: '/Liam_Testimonial.jpg',
    quote:
      "My main photo was holding me back and I had no idea. The feedback was specific and actually useful — not generic advice I'd read online.",
    role: 'Member',
  },
  {
    type: 'customer',
    name: 'Noah',
    photo: '/Noah_Testimonial.jpg',
    quote:
      'Worth it. Clear notes on my profile and photos, no fluff. I updated everything the same night and felt a lot more confident swiping.',
    role: 'Member',
  },
];

const REVIEWER_USERNAMES = TESTIMONIALS.filter((t): t is ReviewerTestimonial => t.type === 'reviewer').map(
  (t) => t.username,
);

function ReviewerCard({
  testimonial,
  profile,
}: {
  testimonial: ReviewerTestimonial;
  profile?: ReviewerProfile;
}) {
  const displayName =
    profileDisplayName(profile) || testimonial.fallbackName;

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.12]">
      <CardContent className="flex h-full flex-col p-8 space-y-5">
        <p className="text-white text-base leading-relaxed italic flex-1">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-4 pt-2">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/20 md:h-24 md:w-24">
            <AsyncAvatar
              avatarPathOrUrl={profile?.avatar_url}
              alt={`${displayName} - Reviewer`}
              size={96}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-xl md:text-2xl">{displayName}</p>
            <p className="text-sm text-white/80">{testimonial.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          asChild
        >
          <Link href={`/request?creatorSlug=${encodeURIComponent(testimonial.username)}`}>
            Request a review
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomerCard({ testimonial }: { testimonial: CustomerTestimonial }) {
  const initials = testimonial.name.charAt(0).toUpperCase();

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.12]">
      <CardContent className="p-8 space-y-5">
        <p className="text-white text-base leading-relaxed italic">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-4 pt-2">
          <Avatar className="h-20 w-20 overflow-hidden ring-2 ring-white/20 md:h-24 md:w-24">
            <AvatarImage
              src={testimonial.photo}
              alt={`${testimonial.name} - Member`}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-white text-xl md:text-2xl">{testimonial.name}</p>
            <p className="text-sm text-white/80">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TestimonialsSection() {
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, ReviewerProfile>>({});

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, avatar_url')
        .in('username', REVIEWER_USERNAMES);

      if (!data) return;

      const byUsername: Record<string, ReviewerProfile> = {};
      for (const profile of data) {
        if (profile.username) {
          byUsername[profile.username] = profile;
        }
      }
      setReviewerProfiles(byUsername);
    };

    fetchProfiles();
  }, []);

  return (
    <section className="landing-section py-16 lg:py-20">
      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center space-y-12">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            What people are saying
          </h2>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) =>
              testimonial.type === 'reviewer' ? (
                <ReviewerCard
                  key={testimonial.username}
                  testimonial={testimonial}
                  profile={reviewerProfiles[testimonial.username]}
                />
              ) : (
                <CustomerCard key={testimonial.name} testimonial={testimonial} />
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
