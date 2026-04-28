CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(100),
  locus_wallet_address VARCHAR(42) NOT NULL,
  trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price_usdc DECIMAL(10,6) NOT NULL,
  category VARCHAR(50) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  original_file_hash VARCHAR(64) NOT NULL,
  encrypted_file_path VARCHAR(500) NOT NULL,
  encryption_key_enc TEXT NOT NULL,
  preview_url VARCHAR(500) NOT NULL,
  preview_version INTEGER DEFAULT 1,
  checkout_session_id VARCHAR(255),
  checkout_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  sender_id UUID REFERENCES users(id) NOT NULL,
  sender_role VARCHAR(10) NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT NOT NULL,
  preview_url VARCHAR(500),
  new_price DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  buyer_id UUID REFERENCES users(id),
  buyer_wallet_address VARCHAR(42) NOT NULL,
  checkout_session_id VARCHAR(255) NOT NULL,
  payment_tx_hash VARCHAR(66),
  payer_address VARCHAR(42),
  paid_at TIMESTAMP,
  on_chain_verified BOOLEAN DEFAULT FALSE,
  detection_source VARCHAR(20),
  download_token VARCHAR(255) UNIQUE,
  download_token_expires TIMESTAMP,
  downloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_checkout ON listings(checkout_session_id);
CREATE INDEX idx_purchases_session ON purchases(checkout_session_id);
CREATE INDEX idx_purchases_token ON purchases(download_token);
CREATE INDEX idx_purchases_listing ON purchases(listing_id);
CREATE INDEX idx_room_messages_listing ON room_messages(listing_id);
