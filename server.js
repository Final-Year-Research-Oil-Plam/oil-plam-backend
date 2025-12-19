const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const os = require('os');

// Load environment file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({ path: path.resolve(__dirname, envFile) });


const { testConnection, initializeDatabase } = require('./config/db');
const authRoutes = require('./routes/auth');
const treeRoutes = require('./routes/tree');
const bunchRoutes = require('./routes/bunch');
const blockRoutes = require('./routes/block');
const qrRoutes = require('./routes/qr');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for mobile development
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/blocks', blockRoutes); // Direct /blocks route for frontend compatibility
app.use('/api/blocks', blockRoutes); // Also available at /api/blocks
app.use('/api/trees', treeRoutes);
app.use('/api/bunches', bunchRoutes);
app.use('/api/qr', qrRoutes); // QR code generation and public viewing

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
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // Get network IP address
    function getNetworkIP() {
      const interfaces = os.networkInterfaces();
      for (const name in interfaces) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
      return 'Unable to detect';
    }

    // Start server - BIND TO 0.0.0.0 for network access
    app.listen(PORT, '0.0.0.0', () => {
      const networkIP = getNetworkIP();
      console.log(`\n🚀 Server running on PORT ${PORT} (bound to 0.0.0.0)`);
      console.log(`\n📱 Use these URLs in your mobile app:\n`);
      console.log(`   Local:   http://localhost:${PORT}/api`);
      console.log(`   Network: http://${networkIP}:${PORT}/api`);
      console.log(`\n💚 Health: http://${networkIP}:${PORT}/api/health\n`);
    });

  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
}

startServer();
