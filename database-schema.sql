-- ===================================================================
-- OIL PALM MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ===================================================================
-- Created: 2025-12-16
-- Description: Complete MySQL database schema for oil palm plantation
--              management system including blocks, trees, bunches, and predictions
-- ===================================================================

-- Drop existing tables (in reverse order of dependencies) if you want a fresh start
-- CAUTION: This will delete all data!
-- DROP TABLE IF EXISTS predictions;
-- DROP TABLE IF EXISTS bunches;
-- DROP TABLE IF EXISTS trees;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS blocks;

-- ===================================================================
-- 1. BLOCKS TABLE (Parent Table - Must be created first)
-- ===================================================================
-- Purpose: Stores information about plantation blocks/sections
-- This is the parent table that trees reference
-- ===================================================================

CREATE TABLE IF NOT EXISTS blocks (
  id VARCHAR(50) PRIMARY KEY COMMENT 'Unique block identifier (e.g., BLOCK-A, BLOCK-B)',
  name VARCHAR(100) NOT NULL COMMENT 'Human-readable block name (e.g., North Section A)',
  area_size VARCHAR(50) COMMENT 'Block area size (e.g., 2.5 hectares)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Plantation blocks/sections';

-- Insert sample blocks (optional - remove if you already have data)
INSERT INTO blocks (id, name, area_size) VALUES
  ('BLOCK-A', 'North Section A', '2.5 hectares'),
  ('BLOCK-B', 'North Section B', '3.0 hectares'),
  ('BLOCK-C', 'South Section A', '2.8 hectares'),
  ('BLOCK-D', 'East Section', '4.2 hectares'),
  ('BLOCK-E', 'West Section', '3.5 hectares')
ON DUPLICATE KEY UPDATE name=VALUES(name), area_size=VALUES(area_size);

-- ===================================================================
-- 2. USERS TABLE
-- ===================================================================
-- Purpose: Stores user authentication and profile information
-- ===================================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing user ID',
  nic VARCHAR(20) UNIQUE NOT NULL COMMENT 'National Identity Card number (unique)',
  username VARCHAR(50) UNIQUE NOT NULL COMMENT 'Username for login (unique)',
  password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  INDEX idx_nic (nic),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System users and authentication';

-- ===================================================================
-- 3. TREES TABLE (References blocks)
-- ===================================================================
-- Purpose: Stores individual palm tree information including location,
--          age, and maintenance history
-- ===================================================================

CREATE TABLE IF NOT EXISTS trees (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing tree ID',
  tree_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique tree identifier (e.g., TREE-A-001)',
  block_id VARCHAR(50) NOT NULL COMMENT 'Foreign key to blocks table',
  
  -- Location Information
  latitude DECIMAL(10, 8) DEFAULT NULL COMMENT 'GPS latitude coordinate (-90 to 90)',
  longitude DECIMAL(11, 8) DEFAULT NULL COMMENT 'GPS longitude coordinate (-180 to 180)',
  place_id VARCHAR(255) DEFAULT NULL COMMENT 'Google Maps Place ID (optional)',
  
  -- Tree Information
  planted_date DATE DEFAULT NULL COMMENT 'Date when tree was planted',
  age INT DEFAULT NULL COMMENT 'Tree age in years (auto-calculated from planted_date)',
  
  -- Fertilizer Information
  fertilizer_type VARCHAR(100) DEFAULT NULL COMMENT 'Type/brand of fertilizer used',
  fertilizer_qty VARCHAR(50) DEFAULT NULL COMMENT 'Quantity of fertilizer (e.g., 5kg, 2.5L)',
  last_fertilizer_date DATE DEFAULT NULL COMMENT 'Last fertilization date',
  
  -- Maintenance Information
  last_pruning_date DATE DEFAULT NULL COMMENT 'Last pruning/trimming date',
  last_weeding_date DATE DEFAULT NULL COMMENT 'Last weeding date',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Indexes for performance
  INDEX idx_block_id (block_id),
  INDEX idx_tree_number (tree_number),
  INDEX idx_planted_date (planted_date),
  INDEX idx_location (latitude, longitude),
  
  -- Foreign key constraint
  CONSTRAINT fk_block_trees 
    FOREIGN KEY (block_id) 
    REFERENCES blocks(id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual palm trees with location and maintenance data';

-- ===================================================================
-- 4. BUNCHES TABLE (References trees)
-- ===================================================================
-- Purpose: Stores information about fruit bunches on trees
-- ===================================================================

CREATE TABLE IF NOT EXISTS bunches (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing bunch ID',
  treeId INT NOT NULL COMMENT 'Foreign key to trees table (note: camelCase for backward compatibility)',
  bunchNumber VARCHAR(50) NOT NULL COMMENT 'Unique bunch identifier',
  
  -- Bunch Information
  stage VARCHAR(50) DEFAULT NULL COMMENT 'Growth stage (e.g., ripening, ripe, unripe)',
  weight DECIMAL(10, 2) DEFAULT NULL COMMENT 'Bunch weight in kg',
  
  -- Media and Notes
  photoPath VARCHAR(255) DEFAULT NULL COMMENT 'Path to bunch photo file',
  notes TEXT DEFAULT NULL COMMENT 'Additional notes about the bunch',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Indexes
  INDEX idx_tree_id (treeId),
  INDEX idx_bunch_number (bunchNumber),
  INDEX idx_stage (stage),
  
  -- Foreign key constraint
  CONSTRAINT fk_tree_bunches 
    FOREIGN KEY (treeId) 
    REFERENCES trees(id) 
    ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Fruit bunches on palm trees';

-- ===================================================================
-- 5. PREDICTIONS TABLE (References bunches and trees)
-- ===================================================================
-- Purpose: Stores AI/ML predictions for disease detection or ripeness
-- ===================================================================

CREATE TABLE IF NOT EXISTS predictions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Auto-incrementing prediction ID',
  bunchId INT NOT NULL COMMENT 'Foreign key to bunches table',
  treeId INT NOT NULL COMMENT 'Foreign key to trees table',
  
  -- Image Information
  photoPath VARCHAR(255) DEFAULT NULL COMMENT 'Path to analyzed photo',
  
  -- YOLO Detection Results
  bunchCount INT DEFAULT NULL COMMENT 'Number of bunches detected in image',
  bunchCoordinates JSON DEFAULT NULL COMMENT 'Bounding box coordinates [x1, y1, x2, y2]',
  
  -- Classification Results
  bunchClass VARCHAR(50) DEFAULT NULL COMMENT 'Bunch class (ripe or unripe)',
  classConfidence DECIMAL(5, 2) DEFAULT NULL COMMENT 'Classification confidence (0-100)',
  
  -- Ripeness Prediction
  harvestDay VARCHAR(50) DEFAULT NULL COMMENT 'Predicted harvest day (2d-16d format)',
  
  -- Legacy fields (kept for backward compatibility)
  prediction JSON DEFAULT NULL COMMENT 'Prediction results as JSON object',
  confidence DECIMAL(5, 2) DEFAULT NULL COMMENT 'Overall prediction confidence (0-100)',
  
  -- Timestamps
  predictionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When prediction was made',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  
  -- Indexes
  INDEX idx_bunch_id (bunchId),
  INDEX idx_tree_id (treeId),
  INDEX idx_prediction_date (predictionDate),
  INDEX idx_bunch_class (bunchClass),
  INDEX idx_harvest_day (harvestDay),
  
  -- Foreign key constraints
  CONSTRAINT fk_bunch_predictions 
    FOREIGN KEY (bunchId) 
    REFERENCES bunches(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_tree_predictions 
    FOREIGN KEY (treeId) 
    REFERENCES trees(id) 
    ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI/ML predictions for ripeness detection and harvest timing';

-- ===================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ===================================================================
-- Insert sample trees for testing (uncomment if needed)

/*
INSERT INTO trees (
  tree_number, block_id, latitude, longitude, 
  planted_date, age, fertilizer_type, fertilizer_qty
) VALUES
  ('TREE-A-001', 'BLOCK-A', 6.927079, 79.861244, '2020-01-15', 4, 'NPK 15-15-15', '5kg'),
  ('TREE-A-002', 'BLOCK-A', 6.927180, 79.861345, '2020-01-20', 4, 'NPK 15-15-15', '5kg'),
  ('TREE-B-001', 'BLOCK-B', 6.928079, 79.862244, '2019-06-10', 5, 'Organic Compost', '10kg'),
  ('TREE-B-002', 'BLOCK-B', 6.928180, 79.862345, '2019-06-15', 5, 'Organic Compost', '10kg'),
  ('TREE-C-001', 'BLOCK-C', 6.926079, 79.860244, '2021-03-20', 3, 'NPK 20-10-10', '4kg')
ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP;
*/

-- ===================================================================
-- USEFUL QUERIES FOR TESTING
-- ===================================================================

-- Check all tables are created
-- SHOW TABLES;

-- Check blocks
-- SELECT * FROM blocks;

-- Check trees with block information
-- SELECT t.*, b.name as block_name 
-- FROM trees t 
-- LEFT JOIN blocks b ON t.block_id = b.id;

-- Count trees per block
-- SELECT b.name, b.id, COUNT(t.id) as tree_count 
-- FROM blocks b 
-- LEFT JOIN trees t ON b.id = t.block_id 
-- GROUP BY b.id, b.name;

-- Get trees that need fertilizing (more than 3 months since last fertilization)
-- SELECT tree_number, block_id, last_fertilizer_date 
-- FROM trees 
-- WHERE last_fertilizer_date < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
-- OR last_fertilizer_date IS NULL;

-- ===================================================================
-- DATABASE VERIFICATION
-- ===================================================================

-- Verify table structure
-- DESCRIBE blocks;
-- DESCRIBE users;
-- DESCRIBE trees;
-- DESCRIBE bunches;
-- DESCRIBE predictions;

-- Check foreign key constraints
-- SELECT 
--   TABLE_NAME,
--   COLUMN_NAME,
--   CONSTRAINT_NAME,
--   REFERENCED_TABLE_NAME,
--   REFERENCED_COLUMN_NAME
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ===================================================================
-- NOTES
-- ===================================================================
-- 1. All tables use InnoDB engine for transaction support and foreign keys
-- 2. UTF8MB4 charset supports full Unicode including emojis
-- 3. Timestamps are automatically managed by MySQL
-- 4. Indexes are added for common query patterns
-- 5. Foreign key constraints maintain referential integrity
-- 6. CASCADE delete ensures orphaned records are removed
-- 7. RESTRICT delete prevents deletion if referenced records exist
-- ===================================================================
