DELETE FROM site_settings WHERE key = 'site_banner';
INSERT INTO site_settings (key, value) VALUES (
  'site_banner',
  '{"message":"Welcome to GauSeva Connect","active":false,"type":"info"}'
);
