-- Add upgrade tracking fields to member_packages table if they don't exist
DO $$ 
BEGIN
    -- Add is_upgrade column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'member_packages' AND column_name = 'is_upgrade') THEN
        ALTER TABLE member_packages ADD COLUMN is_upgrade BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_upgrade column';
    ELSE
        RAISE NOTICE 'is_upgrade column already exists';
    END IF;

    -- Add previous_package_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'member_packages' AND column_name = 'previous_package_id') THEN
        ALTER TABLE member_packages ADD COLUMN previous_package_id UUID;
        RAISE NOTICE 'Added previous_package_id column';
    ELSE
        RAISE NOTICE 'previous_package_id column already exists';
    END IF;
END $$;
