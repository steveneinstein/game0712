CREATE TABLE players (
  id INT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  purchased_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  transaction_id CHAR(36) NOT NULL UNIQUE,
  player_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  provider VARCHAR(40) NOT NULL DEFAULT 'razorpay',
  provider_order_id VARCHAR(80) NULL UNIQUE,
  provider_payment_id VARCHAR(80) NULL UNIQUE,
  provider_signature VARCHAR(255) NULL,
  status ENUM('created', 'paid', 'failed', 'verified', 'credited') NOT NULL DEFAULT 'created',
  error_message VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX wallet_transactions_player_id_idx (player_id),
  INDEX wallet_transactions_status_idx (status),
  CONSTRAINT wallet_transactions_player_fk FOREIGN KEY (player_id) REFERENCES players(id)
);

