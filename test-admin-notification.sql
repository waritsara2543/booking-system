-- ทดสอบ insert ข้อมูลเข้าตาราง admin_notifications
INSERT INTO admin_notifications (booking_id, title, message, is_read)
VALUES 
  (gen_random_uuid(), 'Test Notification', 'This is a test notification', false);

-- ตรวจสอบว่าข้อมูลถูก insert เข้าไปหรือไม่
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 5;
