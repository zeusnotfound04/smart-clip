-- Create database if not exists
SELECT 'CREATE DATABASE smartclip' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smartclip');

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE smartclip TO smartclip_user;