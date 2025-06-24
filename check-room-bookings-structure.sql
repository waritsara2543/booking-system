-- ตรวจสอบโครงสร้างตาราง room_bookings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'room_bookings';
