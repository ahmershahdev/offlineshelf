-- Runs once on an empty data volume. The test database gets the same charset and collation
-- as the real one, which is the reason the project tests against MariaDB at all.
CREATE DATABASE IF NOT EXISTS offlineshelf_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
GRANT ALL PRIVILEGES ON offlineshelf_test.* TO 'offlineshelf'@'%';
