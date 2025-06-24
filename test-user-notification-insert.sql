-- ตรวจสอบข้อมูลในตาราง user_notifications
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10;

-- ตรวจสอบว่ามี member_id ที่ใช้ทดสอบอยู่ในตาราง members หรือไม่
SELECT member_id, name, email FROM members WHERE member_id = 'M000001' OR member_id = 'M000002';

-- ทดสอบเพิ่มข้อมูลการแจ้งเตือนโดยตรง
INSERT INTO user_notifications (user_id, title, message, type, is_read)
VALUES ('M000001', 'Test Direct Insert', 'This is a test notification inserted directly via SQL', 'info', false)
RETURNING *;

-- ตรวจสอบข้อมูลอีกครั้ง
SELECT * FROM user_notifications WHERE user_id = 'M000001' ORDER BY created_at DESC LIMIT 5;
