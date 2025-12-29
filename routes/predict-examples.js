// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const { v2: cloudinary } = require('cloudinary');
// const mysql = require('mysql2/promise');

// const router = express.Router();

// // Database connection helper
// async function getDbConnection() {
//   return await mysql.createConnection({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//   });
// }

// // Example endpoint to upload local sample image for prediction
// router.post('/predict-example', async (req, res) => {
//   let connection;
  
//   try {
//     console.log('🔮 Example prediction endpoint called...');
    
//     // Check if sample image exists
//     const imagePath = path.join(__dirname, '..', 'images', 'Test.jpeg');
//     if (!fs.existsSync(imagePath)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Test.jpeg not found in images folder'
//       });
//     }

//     // Upload to Cloudinary
//     console.log('📤 Uploading Test.jpeg to Cloudinary...');
//     const uploadResult = await cloudinary.uploader.upload(imagePath, {
//       folder: 'bunch_images',
//       upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
//       resource_type: 'image'
//     });
    
//     console.log('✅ Cloudinary upload successful:', uploadResult.secure_url);

//     // Connect to database
//     connection = await getDbConnection();
    
//     // Get first available tree for example
//     const [trees] = await connection.query('SELECT id, tree_number FROM trees LIMIT 1');
//     if (trees.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'No trees found in database. Please add a tree first.'
//       });
//     }
    
//     const sampleTree = trees[0];
    
//     // Generate bunch data
//     const bunchNumber = `EXAMPLE-${sampleTree.tree_number}-${Date.now()}`;
    
//     // Insert into bunches table
//     console.log('💾 Saving to bunches table...');
//     const [insertResult] = await connection.query(`
//       INSERT INTO bunches (treeId, bunchNumber, stage, weight, photoPath, notes, created_at) 
//       VALUES (?, ?, ?, ?, ?, ?, NOW())
//     `, [
//       sampleTree.id,
//       bunchNumber,
//       'prediction-example',
//       null,
//       uploadResult.secure_url,
//       'Example prediction upload via API endpoint'
//     ]);

//     const bunchId = insertResult.insertId;
    
//     // Return success response
//     res.json({
//       success: true,
//       message: 'Example prediction image uploaded to Cloudinary and saved to database successfully!',
//       data: {
//         bunchId: bunchId,
//         bunchNumber: bunchNumber,
//         treeNumber: sampleTree.tree_number,
//         cloudinaryUrl: uploadResult.secure_url,
//         cloudinaryDetails: {
//           public_id: uploadResult.public_id,
//           format: uploadResult.format,
//           width: uploadResult.width,
//           height: uploadResult.height,
//           bytes: uploadResult.bytes
//         }
//       }
//     });
    
//     console.log('🎉 Example prediction upload completed successfully!');

//   } catch (error) {
//     console.error('❌ Example prediction upload error:', error);
    
//     res.status(500).json({
//       success: false,
//       message: 'Failed to upload example prediction image',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   } finally {
//     if (connection) {
//       await connection.end();
//     }
//   }
// });

// // Get all bunches with example prediction data
// router.get('/example-bunches', async (req, res) => {
//   let connection;
  
//   try {
//     connection = await getDbConnection();
    
//     const [bunches] = await connection.query(`
//       SELECT 
//         b.*,
//         t.tree_number 
//       FROM bunches b 
//       JOIN trees t ON b.treeId = t.id 
//       WHERE b.notes LIKE '%example%' OR b.stage = 'prediction-example'
//       ORDER BY b.created_at DESC
//     `);
    
//     res.json({
//       success: true,
//       message: 'Example prediction bunches retrieved successfully',
//       data: bunches
//     });
    
//   } catch (error) {
//     console.error('❌ Error fetching example prediction bunches:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch example prediction bunches',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   } finally {
//     if (connection) {
//       await connection.end();
//     }
//   }
// });

// module.exports = router;