INSERT INTO notices (title, message, content, type, priority, is_active, starts_at, ends_at)
VALUES (
  'Welcome to SellerSuit!',
  'Thank you for using our platform. Check out the new features in your dashboard.',
  'Thank you for using our platform. Check out the new features in your dashboard.',
  'info',
  1,
  true,
  NOW(),
  NOW() + INTERVAL '7 days'
);