-- Add missing columns to recruiter_profiles table

DO $$
BEGIN
    -- Add address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'address') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN address TEXT;
    END IF;

    -- Add company_description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'company_description') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN company_description TEXT;
    END IF;

    -- Add company_size
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'company_size') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN company_size TEXT;
    END IF;

    -- Add industry
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'industry') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN industry TEXT;
    END IF;

    -- Add company_website
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'company_website') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN company_website TEXT;
    END IF;

    -- Add company_logo_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_profiles' AND column_name = 'company_logo_url') THEN
        ALTER TABLE recruiter_profiles ADD COLUMN company_logo_url TEXT;
    END IF;

END $$;
