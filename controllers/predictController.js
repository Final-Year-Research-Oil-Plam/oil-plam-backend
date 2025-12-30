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
      const imageUrl = req.file.path;
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
        INSERT INTO predictions (bunchId, treeId, photoPath, status, created_at)
        VALUES (?, ?, ?, 'pending', NOW())
      `, [bunchId, treeId, imageUrl]);

      const predictionId = predictionResult.insertId;
      console.log('📊 Prediction record created with ID:', predictionId);

      // 6️⃣ Send image URL to ML model
      let mlResponse = null;
      let predictionStatus = 'completed';
      let errorMessage = null;

      try {
        console.log('🤖 Sending to ML model...');
        mlResponse = await this.callMLModel(imageUrl);
        console.log('✅ ML prediction completed:', mlResponse);

        // 7️⃣ Update prediction with ML results
        await connection.query(`
          UPDATE predictions 
          SET prediction = ?, confidence = ?, disease_type = ?, 
              severity_level = ?, recommendations = ?, status = 'completed',
              predictionDate = NOW()
          WHERE id = ?
        `, [
          JSON.stringify(mlResponse.prediction),
          mlResponse.confidence,
          mlResponse.disease_type,
          mlResponse.severity_level,
          mlResponse.recommendations,
          predictionId
        ]);

      } catch (mlError) {
        console.error('❌ ML Model Error:', mlError.message);
        predictionStatus = 'failed';
        errorMessage = mlError.message;

        // Update prediction status to failed
        await connection.query(`
          UPDATE predictions SET status = 'failed' WHERE id = ?
        `, [predictionId]);

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
        prediction: mlResponse
      };

      if (predictionStatus === 'failed') {
        return res.status(201).json({
          success: true,
          message: "Bunch created successfully but prediction failed",
          data: responseData,
          warning: "Prediction service is currently unavailable"
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
    const ML_API_ENDPOINT = process.env.ML_API_ENDPOINT || 'http://localhost:5000/predict';
    const ML_API_KEY = process.env.ML_API_KEY; // Add your ML API key
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key to headers if provided
      if (ML_API_KEY) {
        headers['Authorization'] = `Bearer ${ML_API_KEY}`;
        // or use: headers['X-API-Key'] = ML_API_KEY;
        // depending on your ML service requirements
      }

      const response = await axios.post(ML_API_ENDPOINT, {
        image_url: imageUrl
      }, {
        timeout: 30000, // 30 seconds timeout
        headers
      });

      // Process ML response
      return {
        prediction: response.data.prediction || response.data,
        confidence: response.data.confidence || 0.85,
        disease_type: response.data.disease_type || 'Healthy',
        severity_level: response.data.severity_level || 'Low',
        recommendations: response.data.recommendations || 'No immediate action required'
      };

    } catch (error) {
      // For development, return mock data when ML service is unavailable
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 ML service unavailable, using mock data for development');
        return {
          prediction: { 
            status: 'healthy', 
            class: 'fresh_bunch',
            mock: true 
          },
          confidence: 0.92,
          disease_type: 'None',
          severity_level: 'N/A',
          recommendations: 'Bunch appears healthy and ready for harvest (Mock Response)'
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
