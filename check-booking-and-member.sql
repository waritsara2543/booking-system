-- ตรวจสอบการจองล่าสุด
SELECT * FROM room_bookings ORDER BY created_at DESC LIMIT 5;

-- ตรวจสอบว่า member_id ในการจองล่าสุดมีอยู่ในตาราง members หรือไม่
SELECT rb.id, rb.member_id, rb.name, rb.email, rb.date, rb.room_id, 
       m.member_id AS existing_member_id
FROM room_bookings rb
LEFT JOIN members m ON rb.member_id = m.member_id
ORDER BY rb.created_at DESC
LIMIT 5;
