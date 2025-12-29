const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');
const mysql = require('mysql2/promise');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.development') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function predictImageUpload() {
  let connection;
  
  try {
    console.log('🚀 Starting image upload for prediction...');
    
    // Check if sample image exists
    const imagePath = path.join(__dirname, 'images', 'Test.jpeg');
    if (!fs.existsSync(imagePath)) {
      throw new Error('Test.jpeg not found in images folder');
    }
    console.log('✅ Sample image found:', imagePath);

    // 1. Upload to Cloudinary
    console.log('📤 Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'bunch_images',
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      resource_type: 'image'
    });
    
    console.log('✅ Cloudinary upload successful!');
    console.log('🔗 Cloudinary URL:', result.secure_url);
    console.log('📊 Image details:', {
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    });

    // 2. Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected!');

    // 3. Get first available tree for testing
    const [trees] = await connection.query('SELECT id, tree_number FROM trees LIMIT 1');
    if (trees.length === 0) {
      throw new Error('No trees found in database. Please add a tree first.');
    }
    
    const sampleTree = trees[0];
    console.log('🌳 Using sample tree:', sampleTree.tree_number, 'ID:', sampleTree.id);

    // 5. Generate bunch number
    const bunchNumber = `SAMPLE-BUNCH-${sampleTree.tree_number}-${Date.now()}`;
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 5. Insert into bunches table
    console.log('💾 Saving to database...');
    const [insertResult] = await connection.query(`
      INSERT INTO bunches (treeId, bunchNumber, stage, weight, photoPath, notes, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      sampleTree.id,
      bunchNumber,
      'prediction-example',
      null, // weight
      result.secure_url, // Cloudinary URL
      'Sample prediction upload from local images folder',
      currentTime
    ]);

    const bunchId = insertResult.insertId;
    console.log('✅ Bunch saved to database!');
    console.log('📦 Bunch ID:', bunchId);
    console.log('🔢 Bunch Number:', bunchNumber);

    // 6. Verify the record was saved
    const [savedBunch] = await connection.query(`
      SELECT b.*, t.tree_number 
      FROM bunches b 
      JOIN trees t ON b.treeId = t.id 
      WHERE b.id = ?
    `, [bunchId]);

    console.log('🔍 Verification - Saved record:', {
      id: savedBunch[0].id,
      bunchNumber: savedBunch[0].bunchNumber,
      treeNumber: savedBunch[0].tree_number,
      stage: savedBunch[0].stage,
      photoPath: savedBunch[0].photoPath,
      created_at: savedBunch[0].created_at
    });

    console.log('🎉 SUCCESS! Image uploaded to Cloudinary and saved to database!');
    console.log('🌐 You can view the image at:', result.secure_url);
    
    return {
      success: true,
      cloudinaryUrl: result.secure_url,
      bunchId: bunchId,
      bunchNumber: bunchNumber
    };

  } catch (error) {
    console.error('❌ Error during upload test:', error.message);
    
    // Check specific error types
    if (error.message.includes('cloudinary')) {
      console.error('🔧 Cloudinary configuration issue. Check your environment variables:');
      console.error('   - CLOUDINARY_NAME:', process.env.CLOUDINARY_NAME ? '✅' : '❌');
      console.error('   - CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅' : '❌');
      console.error('   - CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅' : '❌');
    }
    
    if (error.code && error.code.startsWith('ER_')) {
      console.error('🗄️ Database error. Check your database connection and schema.');
    }
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the prediction upload
if (require.main === module) {
  predictImageUpload()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { predictImageUpload };