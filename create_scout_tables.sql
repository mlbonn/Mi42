CREATE TABLE IF NOT EXISTS scout_queue (
  id VARCHAR(64) PRIMARY KEY,
  corporationId VARCHAR(64),
  seedType VARCHAR(50),
  seedData JSON,
  priority INT DEFAULT 5,
  status VARCHAR(50) DEFAULT 'Pending',
  generation INT DEFAULT 0,
  parentId VARCHAR(64),
  discoveryMethod VARCHAR(100),
  scheduledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  startedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  errorMessage TEXT,
  metadata JSON
);

CREATE TABLE IF NOT EXISTS scout_discovery_methods (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  isActive BOOLEAN DEFAULT TRUE,
  config JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
