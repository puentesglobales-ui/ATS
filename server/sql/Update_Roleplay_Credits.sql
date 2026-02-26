-- Update credits_roleplay default from 20 to 1 (one free session)
-- Run this in Supabase SQL Editor

-- 1. Change the default value for new users
ALTER TABLE public.profiles 
ALTER COLUMN credits_roleplay SET DEFAULT 1;

-- 2. Reset existing free users to 1 credit (don't touch premium/admin)
UPDATE public.profiles 
SET credits_roleplay = 1 
WHERE credits_roleplay > 1 
  AND is_premium = false 
  AND role != 'admin';

-- 3. Verify
SELECT id, email, credits_ats, credits_roleplay, is_premium, role 
FROM public.profiles 
ORDER BY role DESC, email;
