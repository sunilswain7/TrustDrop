CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  buyer_id UUID REFERENCES users(id) NOT NULL,
  seller_id UUID REFERENCES users(id) NOT NULL,
  amount_usdc DECIMAL(10,6) NOT NULL,
  checkout_session_id VARCHAR(255) NOT NULL,
  payment_tx_hash VARCHAR(66),
  requested_changes TEXT NOT NULL,
  deadline TIMESTAMP NOT NULL,
  status VARCHAR(30) DEFAULT 'HELD',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_commitments_listing ON commitments(listing_id);
CREATE INDEX idx_commitments_status ON commitments(status);
CREATE INDEX idx_commitments_session ON commitments(checkout_session_id);
CREATE INDEX idx_commitments_deadline ON commitments(deadline) WHERE status = 'HELD';
