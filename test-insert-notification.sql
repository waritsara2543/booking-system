-- ทดสอบเพิ่มข้อมูลโดยตรงในตาราง user_notifications
INSERT INTO user_notifications (user_id, title, message, type, is_read)
VALUES ('ES40NH7', 'Test Notification', 'This is a test notification inserted directly via SQL', 'info', false)
RETURNING *;
