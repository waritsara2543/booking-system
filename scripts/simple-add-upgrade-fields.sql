-- Add upgrade tracking fields to member_packages table (PostgreSQL syntax)
ALTER TABLE member_packages 
ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS previous_package_id UUID;

-- Add comment to confirm completion
COMMENT ON COLUMN member_packages.is_upgrade IS 'Indicates if this is an upgrade from another package';
COMMENT ON COLUMN member_packages.previous_package_id IS 'Reference to the previous package if this is an upgrade';
