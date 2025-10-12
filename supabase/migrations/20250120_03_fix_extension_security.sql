-- Fix extension security issues
-- This migration addresses the "Extension in Public" security warning for pg_net

-- Drop pg_net extension from public schema if it exists
-- This prevents potential security issues with extensions in public schema
drop extension if exists pg_net;

-- If pg_net is needed for your application, you can reinstall it in a dedicated schema
-- Uncomment the following lines if you need pg_net functionality:

-- Create a dedicated schema for network extensions
-- create schema if not exists network;

-- Install pg_net in the dedicated schema
-- create extension if not exists pg_net with schema network;

-- Grant necessary permissions
-- grant usage on schema network to authenticated;
-- grant usage on schema network to service_role;

-- Note: This migration assumes pg_net is not currently in use by your application.
-- If you're using pg_net for HTTP requests or similar functionality, you'll need to:
-- 1. Update your code to reference network.pg_net instead of pg_net
-- 2. Or reinstall it in the public schema if no alternative exists
-- 3. Ensure proper access controls are in place

