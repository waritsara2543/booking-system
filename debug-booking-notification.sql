-- ตรวจสอบการจองล่าสุด
SELECT rb.id, rb.member_id, rb.name, rb.room_id, rb.date, rb.start_time, rb.end_time, rb.created_at,
       r.name as room_name
FROM room_bookings rb
LEFT JOIN rooms r ON rb.room_id = r.id
ORDER BY rb.created_at DESC
LIMIT 5;

-- ตรวจสอบข้อมูลสมาชิกที่เกี่ยวข้องกับการจองล่าสุด
SELECT m.id, m.member_id, m.name, m.email
FROM members m
WHERE m.id IN (
  SELECT rb.member_id
  FROM room_bookings rb
  ORDER BY rb.created_at DESC
  LIMIT 5
);

-- ตรวจสอบการแจ้งเตือนล่าสุด
SELECT *
FROM user_notifications
ORDER BY created_at DESC
LIMIT 10;
