-- Insert admin user if not exists
INSERT INTO users (username, email, password, first_name, role, is_active, created_at)
SELECT 'admin', 'admin@tradeflow.com', '$2a$10$K7L7bqvJp9wBqE4a5x3ZP.nwXh2v6dN4Yf3V5u7wBqE4a5x3ZP.', 'Admin', 'admin', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@tradeflow.com'
);

-- Ensure admin has USDT balance for testing
INSERT INTO balances (user_id, asset, available, locked)
SELECT id, 'USDT', 100000, 0
FROM users
WHERE email = 'admin@tradeflow.com'
AND NOT EXISTS (
    SELECT 1 FROM balances WHERE user_id = users.id AND asset = 'USDT'
);

-- Show admin user
SELECT id, username, email, role, is_active FROM users WHERE email = 'admin@tradeflow.com';
