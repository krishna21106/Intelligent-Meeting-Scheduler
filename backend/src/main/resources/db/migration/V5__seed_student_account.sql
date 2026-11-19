-- Seed Student / Customer demo account
INSERT INTO users (username, password_hash, email, role_name, created_at)
SELECT 'student', '$2a$10$w85J.Xk7Hk7GjKqT.wO5IOM3c6l0eXm8B3F2qZ9Y5L6O0V8w2S6s.', 'student@cnip.network', 'CUSTOMER', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'student');

-- Assign demo devices (nyc-acc-sw-01 and nyc-wifi-ap-01) to student user
UPDATE devices 
SET customer_id = (SELECT id FROM users WHERE username = 'student')
WHERE name IN ('nyc-acc-sw-01', 'nyc-wifi-ap-01')
  AND customer_id IS NULL;
