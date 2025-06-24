-- Check admin_notifications table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;

-- Check user_notifications table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Check for recent admin notifications
SELECT *
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Check for recent user notifications
SELECT *
FROM user_notifications
ORDER BY created_at DESC
LIMIT 10;
