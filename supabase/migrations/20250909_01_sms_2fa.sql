-- Create table for SMS verification codes
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('setup', 'verify')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_user_phone 
ON sms_verification_codes(user_id, phone, action, expires_at);

-- Create table for user 2FA settings
CREATE TABLE IF NOT EXISTS user_two_factor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    phone TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_two_factor_user_id 
ON user_two_factor(user_id);

-- Enable RLS
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_two_factor ENABLE ROW LEVEL SECURITY;

-- RLS policies for sms_verification_codes
CREATE POLICY "Users can manage their own verification codes" 
ON sms_verification_codes
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for user_two_factor
CREATE POLICY "Users can view their own 2FA settings" 
ON user_two_factor
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings" 
ON user_two_factor
FOR ALL
USING (auth.uid() = user_id);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM sms_verification_codes 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired codes (runs every hour)
-- This requires the pg_cron extension which may need to be enabled
-- SELECT cron.schedule('cleanup-expired-sms-codes', '0 * * * *', 'SELECT cleanup_expired_sms_codes();');


