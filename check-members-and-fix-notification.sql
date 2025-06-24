-- 1. ตรวจสอบโครงสร้างตาราง members
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members'
ORDER BY ordinal_position;

-- 2. ตรวจสอบข้อมูลในตาราง members
SELECT member_id, name, email 
FROM members 
LIMIT 10;

-- 3. ตรวจสอบ foreign key constraint
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_notifications';

-- 4. ถ้าต้องการลบ foreign key constraint (ระวัง!)
-- ALTER TABLE user_notifications DROP CONSTRAINT fk_user;

-- 5. หรือสร้าง member ทดสอบก่อน
INSERT INTO members (member_id, name, email, phone, created_at)
VALUES ('M000001', 'Test User', 'test@example.com', '0812345678', NOW())
ON CONFLICT (member_id) DO NOTHING;

-- 6. ลองเพิ่มการแจ้งเตือนอีกครั้ง
INSERT INTO user_notifications (user_id, title, message, type, is_read)
VALUES ('M000001', 'Test Notification', 'This is a test notification', 'info', false);

-- 7. ตรวจสอบผลลัพธ์
SELECT * FROM user_notifications WHERE user_id = 'M000001';
