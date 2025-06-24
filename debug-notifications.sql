-- ตรวจสอบโครงสร้างตาราง user_notifications
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_notifications';

-- ตรวจสอบข้อมูลในตาราง user_notifications
SELECT * FROM user_notifications LIMIT 10;

-- ตรวจสอบโครงสร้างตาราง members
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members';

-- ตรวจสอบความสัมพันธ์ระหว่าง member_id และ user_id ในตาราง members
SELECT id, member_id, user_id, auth_user_id 
FROM members 
LIMIT 10;

-- ตรวจสอบข้อมูลการจองห้อง
SELECT id, member_id, name, email, room_id, date, status
FROM room_bookings
ORDER BY created_at DESC
LIMIT 10;
