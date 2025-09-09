# SMS 2FA Setup Guide

## Overview
Your app now has **SMS-based Two-Factor Authentication** using Twilio's free tier. Users can secure their accounts with SMS verification codes sent to their phone numbers.

## 🚀 What's Implemented

### Frontend Components
- **SMS 2FA Setup Screen** (`app/two-factor-setup.tsx`) - Phone number input & verification
- **SMS 2FA Verification Screen** (`app/two-factor-verify.tsx`) - Code verification during login
- **Settings Integration** - Enable/disable SMS 2FA from profile settings
- **Auth Flow Integration** - Automatic SMS 2FA challenge during login

### Backend Components
- **Supabase Edge Functions** - Secure SMS sending and verification
- **Database Tables** - Store verification codes and user 2FA preferences
- **Twilio Integration** - SMS delivery service

## 📋 Setup Requirements

### 1. Create Twilio Account (FREE)
1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Get **$15.50 in free credits** (covers ~2,000 SMS messages)
3. Verify your phone number
4. Get a Twilio phone number (free with trial)

### 2. Get Twilio Credentials
From your Twilio Console Dashboard:
- **Account SID** (starts with AC...)
- **Auth Token** (secret key)
- **Phone Number** (your Twilio number, format: +1234567890)

### 3. Configure Environment Variables

#### For Local Development (.env.local)
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

#### For Supabase Edge Functions
Set these environment variables in your Supabase project:

1. Go to Supabase Dashboard → Settings → Environment Variables
2. Add these variables:
   - `TWILIO_ACCOUNT_SID` = Your Account SID
   - `TWILIO_AUTH_TOKEN` = Your Auth Token  
   - `TWILIO_PHONE_NUMBER` = Your Twilio phone number

### 4. Deploy Supabase Functions
```bash
# Deploy the SMS functions
supabase functions deploy send-sms-code
supabase functions deploy verify-sms-code

# Apply database migrations
supabase db push
```

## 💰 Cost Breakdown

### Twilio Pricing (As of 2024)
- **Free Trial**: $15.50 in credits
- **SMS Cost**: ~$0.0075 per message
- **Phone Number**: $1/month (after trial)
- **Estimated Free Messages**: ~2,000 SMS

### Monthly Cost Estimates
- **Small App** (100 users, 20% use 2FA, 5 logins/month): ~$0.75/month
- **Medium App** (1,000 users, 30% use 2FA, 10 logins/month): ~$22.50/month
- **Large App** (10,000 users, 40% use 2FA, 15 logins/month): ~$450/month

## 🔒 Security Features

- **6-digit verification codes** that expire in 5 minutes
- **Rate limiting** built into Supabase functions
- **Secure code storage** with automatic cleanup
- **Phone number validation** with country code support
- **Resend functionality** with cooldown periods

## 📱 User Experience

### Setup Flow
1. User goes to Profile → Settings → Security
2. Taps "Enable" next to SMS Two-Factor Authentication
3. Enters phone number with country code
4. Receives SMS with 6-digit code
5. Verifies code to enable 2FA

### Login Flow
1. User enters email/password normally
2. If SMS 2FA is enabled, receives SMS with code
3. Enters 6-digit code to complete login
4. Can request new code if needed

## 🎯 Testing

### Test Phone Numbers (Twilio Trial)
During trial, you can only send SMS to verified phone numbers:
1. Go to Twilio Console → Phone Numbers → Manage → Verified Caller IDs
2. Add your test phone numbers
3. Use these numbers for testing

### Production Ready
Once you add payment method to Twilio:
- Can send to any valid phone number
- No verification required
- Full SMS delivery worldwide

## 🚀 Benefits Over Authenticator Apps

1. **No App Required** - Users don't need to download authenticator apps
2. **Universal** - Works on any phone (smart or basic)
3. **Familiar** - Users understand SMS verification
4. **Marketing Channel** - Can send other notifications via SMS
5. **Recovery** - Easier account recovery flow

## 🛡️ Security Considerations

1. **SIM Swapping** - SMS is vulnerable to SIM swap attacks
2. **Backup Codes** - Consider implementing backup codes
3. **Rate Limiting** - Monitor for abuse of SMS sending
4. **International** - Be aware of international SMS costs

## 📞 Support & Notifications

With this SMS infrastructure in place, you can also:
- Send password reset codes
- Account verification during signup  
- Marketing notifications (with consent)
- Order/review status updates
- Emergency security notifications

Your SMS 2FA is now ready to use! 🎉


