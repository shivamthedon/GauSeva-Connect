-- Site settings (banner, maintenance mode, etc.)
CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT);

-- User reports
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, data TEXT);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, data TEXT);

-- Insert default settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('site_banner', '{"message":"","active":false}');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('maintenance_mode', '{"enabled":false,"message":"Site is under maintenance"}');
