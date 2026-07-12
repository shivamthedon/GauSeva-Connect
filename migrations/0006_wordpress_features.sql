-- Reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, listingId TEXT, userId TEXT, data TEXT);

-- Comments on listings
CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, listingId TEXT, userId TEXT, data TEXT);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, data TEXT);

-- Media library
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, data TEXT);
