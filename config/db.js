const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({ path: path.resolve(__dirname, envFile) });

console.log('📌 DB Config:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Port:', process.env.DB_PORT);

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    console.log('📋 [DB INIT] Creating/verifying database tables...');

    // Blocks table - MUST BE CREATED FIRST (parent table)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        area_size VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ [DB INIT] Blocks table created/verified');

    // Check if blocks table has data
    const [blockRows] = await connection.query('SELECT COUNT(*) as count FROM blocks');
    console.log(`📊 [DB INIT] Blocks in database: ${blockRows[0].count}`);
    
    if (blockRows[0].count === 0) {
      console.log('⚠️ [DB INIT] No blocks found! Inserting sample blocks...');
      await connection.query(`
        INSERT INTO blocks (id, name, area_size) VALUES
        ('BLOCK-A', 'North Section A', '2.5 hectares'),
        ('BLOCK-B', 'North Section B', '3.0 hectares'),
        ('BLOCK-C', 'South Section A', '2.8 hectares'),
        ('BLOCK-D', 'East Section', '4.2 hectares')
      `);
      console.log('✅ [DB INIT] Sample blocks inserted');
    }

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nic VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ [DB INIT] Users table created/verified');

    // Trees table (updated schema with proper fields)
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS trees (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tree_number VARCHAR(50) NOT NULL UNIQUE,
          block_id VARCHAR(50) NOT NULL COLLATE utf8mb4_0900_ai_ci,
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          place_id VARCHAR(255) DEFAULT NULL,
          planted_date DATE DEFAULT NULL,
          age INT DEFAULT NULL,
          fertilizer_type VARCHAR(100) DEFAULT NULL,
          fertilizer_qty VARCHAR(50) DEFAULT NULL,
          last_fertilizer_date DATE DEFAULT NULL,
          last_pruning_date DATE DEFAULT NULL,
          last_weeding_date DATE DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_block_id (block_id),
          INDEX idx_tree_number (tree_number),
          INDEX idx_planted_date (planted_date),
          CONSTRAINT fk_block_trees FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ [DB INIT] Trees table created/verified');
    } catch (treeError) {
      console.error('❌ [DB INIT] Failed to create trees table:', treeError.message);
      throw treeError;
    }

    // Bunches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bunches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        treeId INT NOT NULL,
        bunchNumber VARCHAR(50) NOT NULL,
        stage VARCHAR(50),
        weight DECIMAL(10, 2),
        photoPath VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (treeId) REFERENCES trees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ [DB INIT] Bunches table created/verified');

    // Predictions table for disease detection
    await connection.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bunchId INT NOT NULL,
        treeId INT NOT NULL,
        photoPath VARCHAR(255),
        prediction JSON,
        confidence DECIMAL(5, 2),
        predictionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bunchId) REFERENCES bunches(id) ON DELETE CASCADE,
        FOREIGN KEY (treeId) REFERENCES trees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ [DB INIT] Predictions table created/verified');

    console.log('✅ [DB INIT] All database tables initialized successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
