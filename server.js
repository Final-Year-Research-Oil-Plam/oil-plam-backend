const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (dbConnected) {
    // Initialize database tables
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
    });
  } else {
    console.error('❌ Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }
}

startServer();

