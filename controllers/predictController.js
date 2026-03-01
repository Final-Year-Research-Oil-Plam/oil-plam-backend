const axios = require("axios");
const { pool } = require("../config/db");

class PredictController {

  static async createPrediction(req, res) {
    let connection;
    
    try {
      const { blockId, treeId, bunchNumber, stage, weight, notes } = req.body;

      // 1️⃣ Validate required fields
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file is required"
        });
      }

      if (!blockId || !treeId) {
        return res.status(400).json({
          success: false,
          message: "Block ID and Tree ID are required"
        });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 2️⃣ Validate tree exists in the specified block
      const [treeRows] = await connection.query(
        'SELECT id, tree_number, block_id FROM trees WHERE id = ? AND block_id = ?',
        [treeId, blockId]
      );

      if (treeRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Tree not found in the specified block"
        });
      }

      const tree = treeRows[0];
      console.log('✅ Tree validated:', tree.tree_number, 'in block:', blockId);

      // 3️⃣ Get Cloudinary URL (generated automatically by middleware)
      console.log('📁 Uploaded file object properties:', Object.keys(req.file));
      console.log('📁 Full file object:', JSON.stringify(req.file, null, 2));
      
      // Cloudinary storage can return path in different properties
      const imageUrl = req.file.path || req.file.secure_url || req.file.url || req.file.cloudinaryPath;
      
      if (!imageUrl) {
        console.error('❌ ERROR: No Cloudinary URL found in uploaded file!');
        console.error('📁 Available file properties:', Object.keys(req.file));
        throw new Error('Image upload failed - no URL returned from Cloudinary');
      }
      
      console.log('📷 Image uploaded to Cloudinary:', imageUrl);

      // 4️⃣ Create bunch record in database
      const generatedBunchNumber = bunchNumber || `BUNCH-${tree.tree_number}-${Date.now()}`;
      
      const [bunchResult] = await connection.query(`
        INSERT INTO bunches (treeId, bunchNumber, stage, weight, photoPath, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [treeId, generatedBunchNumber, stage || 'mature', weight || null, imageUrl, notes || null]);

      const bunchId = bunchResult.insertId;
      console.log('✅ Bunch created with ID:', bunchId, 'Number:', generatedBunchNumber);

      // 5️⃣ Create prediction record (status: pending)
      const [predictionResult] = await connection.query(`
        INSERT INTO predictions (bunchId, treeId, photoPath , created_at)
        VALUES (?, ?, ?, NOW())
      `, [bunchId, treeId, imageUrl]);

      const predictionId = predictionResult.insertId;
      console.log('📊 Prediction record created with ID:', predictionId);

      // 6️⃣ Send image URL to ML model
      let mlResponse = null;
      let predictionStatus = 'completed';


      try {
        console.log('🤖 Sending to ML model...');
        mlResponse = await PredictController.callMLModel(imageUrl);

        // Check if detection was successful
        if (!mlResponse.success || mlResponse.count === 0) {
          console.warn('⚠️ No bunch detected in image');
          predictionStatus = 'completed_no_detection';
          await connection.query(`
            UPDATE predictions 
            SET bunchCount = 0, 
                bunchCoordinates = NULL, 
                bunchClass = NULL, 
                classConfidence = NULL, 
                harvestDay = NULL,
                prediction = ?,
                confidence = 0,
                predictionDate = NOW()
            WHERE id = ?
          `, [JSON.stringify(mlResponse), predictionId]);
        } else {
          // 7️⃣ Update prediction with ML results (successful detection)
          console.log('✅ Bunch detected! Details:', {
            count: mlResponse.count,
            class: mlResponse.class,
            confidence: mlResponse.confidence,
            final_date: mlResponse.final_date
          });
          
          await connection.query(`
            UPDATE predictions 
            SET bunchCount = ?, 
                bunchCoordinates = ?, 
                bunchClass = ?, 
                classConfidence = ?, 
                harvestDay = ?,
                prediction = ?,
                confidence = ?,
                predictionDate = NOW()
            WHERE id = ?
          `, [
            mlResponse.count,
            JSON.stringify(mlResponse.coordinates),
            mlResponse.class,
            mlResponse.confidence,
            mlResponse.final_date,
            JSON.stringify(mlResponse),
            mlResponse.confidence,
            predictionId
          ]);
        }

      } catch (mlError) {
        console.error('❌ ML Model Error:', mlError.message);
        
        // Log detailed error information
        if (mlError.response) {
          console.error('❌ ML Response Status:', mlError.response.status);
          console.error('❌ ML Response Data:', JSON.stringify(mlError.response.data, null, 2));
        } else if (mlError.code) {
          console.error('❌ Network Error Code:', mlError.code);
          console.error('❌ Message:', mlError.message);
        }
        
        predictionStatus = 'failed';
        errorMessage = mlError.message;

        // Update prediction status to failed
        await connection.query(`
          UPDATE predictions SET status = 'failed', prediction = ?, predictionDate = NOW() WHERE id = ?
        `, [
          JSON.stringify({ error: mlError.message, success: false }),
          predictionId
        ]);

        // Use mock data for development
        mlResponse = {
          prediction: { status: 'error', message: 'ML service unavailable' },
          confidence: 0.0,
          disease_type: 'Unknown',
          severity_level: 'N/A',
          recommendations: 'Please retry prediction later'
        };
      }

      await connection.commit();

      // 8️⃣ Return response to frontend
      const responseData = {
        bunchId,
        predictionId,
        bunchNumber: generatedBunchNumber,
        treeNumber: tree.tree_number,
        blockId,
        imageUrl,
        status: predictionStatus,
        // YOLO Detection & Classification Results
        bunchCount: mlResponse.count || 0,
        bunchCoordinates: mlResponse.coordinates || [],
        bunchClass: mlResponse.class || null,
        classConfidence: mlResponse.confidence || 0,
        harvestDay: mlResponse.final_date || null,
        detectionSuccess: mlResponse.success || false,
        mlMessage: mlResponse.message || 'Unknown result',
        // Legacy prediction field
        prediction: mlResponse
      };

      if (predictionStatus === 'failed') {
        return res.status(201).json({
          success: true,
          message: "Bunch created successfully but prediction failed",
          data: responseData,
          warning: "Prediction service is currently unavailable. Please check ML server."
        });
      }

      if (predictionStatus === 'completed_no_detection') {
        return res.status(201).json({
          success: true,
          message: "Image analyzed but no bunch detected",
          data: responseData,
          warning: "No bunch was detected in the image. Please retake photo with clearer bunch view."
        });
      }

      return res.status(201).json({
        success: true,
        message: "Bunch prediction completed successfully",
        data: responseData
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('❌ Prediction Controller Error:', error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to process prediction",
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }

  // Helper method to call ML model with proper error handling
  static async callMLModel(imageUrl) {
    const ML_API_ENDPOINT = process.env.ML_API_ENDPOINT || 'http://localhost:8000/palm/detect-from-url';
    const ML_API_KEY = process.env.ML_API_KEY; // Optional API key for security
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key to headers if provided
      if (ML_API_KEY) {
        headers['Authorization'] = `Bearer ${ML_API_KEY}`;
      }

      console.log('🤖 Calling ML Model:', ML_API_ENDPOINT);
      console.log('📸 Image URL:', imageUrl);
      console.log('📋 Request payload:', JSON.stringify({ image_url: imageUrl }, null, 2));

      const response = await axios.post(ML_API_ENDPOINT, {
        image_url: imageUrl
      }, {
        timeout: 60000, // 60 seconds timeout for model inference
        headers
      });
      
      console.log('✅ ML Response received:', JSON.stringify(response.data, null, 2));

      console.log('✅ ML Response received:', JSON.stringify(response.data, null, 2));

      // Parse YOLO response
      return {
        success: response.data.success,
        message: response.data.message,
        count: response.data.count,
        coordinates: response.data.coordinates || [],
        class: response.data.class, // 'ripe' or 'unripe'
        confidence: response.data.confidence,
        final_date: response.data.final_date // e.g., "Day 12"
      };

    } catch (error) {
      console.error('❌ ML Model Error:', error.message);
      
      // Show detailed error response from ML if available
      if (error.response) {
        console.error('❌ ML Response Status:', error.response.status);
        console.error('❌ ML Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('❌ Full Error Details:', {
        message: error.message,
        code: error.code,
        errno: error.errno
      });
      
      // For development, return mock data when ML service is unavailable
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 ML service unavailable, using mock data for development');
        return {
          success: true,
          message: 'Object detected (Mock Response)',
          count: 1,
          coordinates: [{ x1: 150, y1: 200, x2: 450, y2: 600 }],
          class: 'ripe',
          confidence: 0.92,
          final_date: 'Day 12'
        };
      }
      
      throw new Error(`ML prediction service failed: ${error.message}`);
    }
  }

  // Get all predictions for dashboard with pagination
  static async getAllPredictions(req, res) {
    try {
      const { page = 1, limit = 10, status, blockId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      let queryParams = [];
      
      if (status) {
        whereClause += ' AND p.status = ?';
        queryParams.push(status);
      }
      
      if (blockId) {
        whereClause += ' AND bl.id = ?';
        queryParams.push(blockId);
      }
      
      // Get total count
      const [countRows] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM predictions p
        JOIN bunches b ON p.bunchId = b.id
        JOIN trees t ON p.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        ${whereClause}
      `, queryParams);
      
      const total = countRows[0].total;
      
      // Get paginated results
      const [rows] = await pool.query(`
        SELECT 
          p.id as predictionId,
          p.prediction,
          p.confidence,
          p.predictionDate,
          p.created_at,
          p.photoPath,
          b.id as bunchId,
          b.bunchNumber,
          b.stage,
          b.weight,
          b.notes,
          t.id as treeId,
          t.tree_number,
          bl.id as block_id,
          bl.name as block_name
        FROM predictions p
        JOIN bunches b ON p.bunchId = b.id
        JOIN trees t ON p.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get all predictions error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get predictions',
        error: error.message
      });
    }
  }

  // Get recent predictions for dashboard overview
  static async getRecentPredictions(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      const [rows] = await pool.query(`
        SELECT 
          p.id as predictionId,
          p.prediction,
          p.confidence,
          p.created_at,
          p.photoPath,
          b.bunchNumber,
          t.tree_number,
          bl.name as block_name
        FROM predictions p
        JOIN bunches b ON p.bunchId = b.id
        JOIN trees t ON p.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        ORDER BY p.created_at DESC
        LIMIT ?
      `, [parseInt(limit)]);

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Get recent predictions error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent predictions',
        error: error.message
      });
    }
  }

  // Get prediction statistics for dashboard
  static async getPredictionStats(req, res) {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as totalPredictions,
          AVG(CASE WHEN confidence IS NOT NULL THEN confidence ELSE 0 END) as avgConfidence,
          COUNT(DISTINCT DATE(created_at)) as activeDays
        FROM predictions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('Get prediction stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get prediction statistics',
        error: error.message
      });
    }
  }

  // Get bunches by tree ID for bunch management
  static async getBunchesByTree(req, res) {
    try {
      const { treeId } = req.params;
      
      const [rows] = await pool.query(`
        SELECT 
          b.id as bunchId,
          b.bunchNumber,
          b.stage,
          b.weight,
          b.photoPath,
          b.notes,
          b.created_at,
          t.tree_number,
          bl.name as block_name,
          p.id as predictionId,
          p.prediction,
          p.confidence,
          p.predictionDate
        FROM bunches b
        JOIN trees t ON b.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        LEFT JOIN predictions p ON b.id = p.bunchId
        WHERE b.treeId = ?
        ORDER BY b.created_at DESC
      `, [treeId]);

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Get bunches by tree error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get bunches',
        error: error.message
      });
    }
  }

  // Get detailed prediction by prediction ID
  static async getPredictionDetail(req, res) {
    try {
      const { predictionId } = req.params;
      
      const [rows] = await pool.query(`
        SELECT 
          p.id as predictionId,
          p.prediction,
          p.confidence,
          p.predictionDate,
          p.created_at,
          p.photoPath,
          b.id as bunchId,
          b.bunchNumber,
          b.stage,
          b.weight,
          b.notes,
          b.created_at as bunchCreatedAt,
          t.id as treeId,
          t.tree_number,
          t.block_id,
          bl.name as block_name
        FROM predictions p
        JOIN bunches b ON p.bunchId = b.id
        JOIN trees t ON p.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        WHERE p.id = ?
      `, [predictionId]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Prediction not found'
        });
      }

      res.json({
        success: true,
        data: rows[0]
      });

    } catch (error) {
      console.error('Get prediction detail error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get prediction details',
        error: error.message
      });
    }
  }

  // Get prediction by bunch ID
  static async getPrediction(req, res) {
    try {
      const { bunchId } = req.params;
      
      const [rows] = await pool.query(`
        SELECT 
          p.*,
          b.bunchNumber,
          b.stage,
          b.weight,
          b.notes,
          t.tree_number,
          bl.name as block_name,
          bl.id as block_id
        FROM predictions p
        JOIN bunches b ON p.bunchId = b.id
        JOIN trees t ON p.treeId = t.id
        JOIN blocks bl ON t.block_id = bl.id
        WHERE p.bunchId = ?
        ORDER BY p.created_at DESC
        LIMIT 1
      `, [bunchId]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No prediction found for this bunch'
        });
      }

      res.json({
        success: true,
        data: rows[0]
      });

    } catch (error) {
      console.error('Get prediction error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get prediction',
        error: error.message
      });
    }
  }
}

module.exports = PredictController;
