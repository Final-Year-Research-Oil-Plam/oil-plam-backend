const { v2: cloudinary } = require('cloudinary');

// Configuration will be loaded from environment variables by server.js
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug: Log configuration status (without exposing secrets)
console.log('🔧 Cloudinary Config Status:', {
  cloud_name: process.env.CLOUDINARY_NAME ? '✅ Set' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing', 
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'
});

module.exports = { cloudinary };