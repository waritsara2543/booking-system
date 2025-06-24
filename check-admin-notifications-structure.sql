-- Check admin_notifications table structure in detail
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;

-- Try inserting a test notification with a valid UUID
INSERT INTO admin_notifications (booking_id, title, message, is_read)
VALUES (gen_random_uuid(), 'Test Notification 2', 'This is another test notification', false)
RETURNING *;
