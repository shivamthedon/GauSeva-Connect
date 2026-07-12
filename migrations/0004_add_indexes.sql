-- Indexes for listings table to speed up filtered queries
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings (json_extract(data, '$.type'));
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (json_extract(data, '$.milkingStatus'));
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (json_extract(data, '$.price'));
CREATE INDEX IF NOT EXISTS idx_listings_posted ON listings (json_extract(data, '$.postedAt'));
