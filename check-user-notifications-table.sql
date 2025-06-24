-- ตรวจสอบโครงสร้างตาราง user_notifications
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'user_notifications'
ORDER BY 
  ordinal_position;
