-- ตรวจสอบการแจ้งเตือนทั้งหมดสำหรับ member ES40NH7
SELECT 
    'user_notifications' as table_name,
    id,
    user_id,
    title,
    message,
    created_at
FROM user_notifications
WHERE user_id = 'ES40NH7'

UNION ALL

-- ตรวจสอบ admin notifications ที่เกี่ยวข้องกับ bookings ของ member นี้
SELECT 
    'admin_notifications' as table_name,
    an.id,
    rb.member_id as user_id,
    an.title,
    an.message,
    an.created_at
FROM admin_notifications an
LEFT JOIN room_bookings rb ON an.booking_id = rb.id
WHERE rb.member_id = 'ES40NH7'
ORDER BY created_at DESC;
