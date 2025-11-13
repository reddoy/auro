-- Add push notification token support to profiles table
-- Safe to run multiple times

-- Add push_token column to profiles table for storing Expo push notification tokens
alter table if exists public.profiles
  add column if not exists push_token text;

-- Add index for efficient lookups by push token
create index if not exists idx_profiles_push_token on public.profiles(push_token) where push_token is not null;

-- Add comment explaining the column
comment on column public.profiles.push_token is 'Expo push notification token for sending push notifications to this user';

