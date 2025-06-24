INSERT INTO user_notifications (
  user_id,
  title,
  message,
  type,
  is_read
) VALUES (
  'ES40NH7',
  'Test Direct SQL Notification',
  'This is a test notification created directly via SQL',
  'info',
  false
);

SELECT * FROM user_notifications WHERE user_id = 'ES40NH7';
