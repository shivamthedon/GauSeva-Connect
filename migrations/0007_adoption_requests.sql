-- Adoption request flow
CREATE TABLE IF NOT EXISTS adoption_requests (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL,
  requesterId TEXT NOT NULL,
  ownerId TEXT,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adoption_listing ON adoption_requests(listingId);
CREATE INDEX IF NOT EXISTS idx_adoption_requester ON adoption_requests(requesterId);
CREATE INDEX IF NOT EXISTS idx_adoption_owner ON adoption_requests(ownerId);
