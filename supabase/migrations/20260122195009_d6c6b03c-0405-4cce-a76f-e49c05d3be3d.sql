-- Insert a fresh test announcement with high priority to verify the notification system
INSERT INTO notices (title, content, type, priority, is_active, starts_at, ends_at, target_audience) 
VALUES (
  'Fresh System Announcement', 
  'This is a brand new announcement to verify the notification system is working correctly.', 
  'warning', 
  100, 
  true, 
  NULL, 
  NULL, 
  'all'
);