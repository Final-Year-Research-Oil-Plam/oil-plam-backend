const { pool } = require('../config/db');
const path = require('path');

// Add new bunch
exports.addBunch = async (req, res) => {
  try {
    const { treeId, bunchNumber, stage, weight, notes } = req.body;
    const photoPath = req.file ? req.file.path : null;

    // Validation
    if (!treeId || !bunchNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tree ID and bunch number are required'
      });
    }

    // Check if tree exists
    const [trees] = await pool.query(
      'SELECT id FROM trees WHERE id = ?',
      [treeId]
    );

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }

    // Insert bunch
    const [result] = await pool.query(
      'INSERT INTO bunches (treeId, bunchNumber, stage, weight, photoPath, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [treeId, bunchNumber, stage || null, weight || null, photoPath, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Bunch added successfully',
      data: {
        id: result.insertId,
        treeId,
        bunchNumber,
        stage,
        weight,
        photoPath,
        notes
      }
    });
  } catch (error) {
    console.error('Add bunch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Predict bunch (disease detection)
/**
 * POST /api/bunches/predict
 * Predict bunch count from uploaded image
 * Request: multipart/form-data { image: File, blockId: string, treeId: string }
 * Response: { success, message, data: { predictedBunches, confidence, timestamp } }
 */
exports.predictBunch = async (req, res) => {
  try {
    const { blockId, treeId } = req.body;
    const imageFile = req.file;

    // Validation
    if (!blockId || !treeId) {
      return res.status(400).json({
        success: false,
        message: 'Block ID and Tree ID are required'
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required for prediction'
      });
    }

    // Validate tree exists and belongs to the block
    const [trees] = await pool.query(
      'SELECT id, tree_number, block_id FROM trees WHERE id = ? AND block_id = ?',
      [treeId, blockId]
    );

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found or does not belong to the specified block'
      });
    }

    const imagePath = imageFile.path;
    console.log(`🔮 Predicting bunches for tree ${trees[0].tree_number} in block ${blockId}`);
    console.log(`📸 Image path: ${imagePath}`);

    // TODO: Call your FastAPI ML model here
    // const mlResponse = await axios.post('http://localhost:8000/predict', {
    //   image: imagePath,
    //   blockId,
    //   treeId
    // });

    // Mock prediction (replace with actual ML model call)
    const mockPrediction = {
      predictedBunches: Math.floor(Math.random() * 15) + 5, // 5-20 bunches
      confidence: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)), // 0.70-1.00
      timestamp: new Date().toISOString()
    };

    // Store prediction in database
    await pool.query(
      `INSERT INTO predictions 
       (tree_id, photo_path, predicted_bunches, confidence, prediction_date) 
       VALUES (?, ?, ?, ?, NOW())`,
      [treeId, imagePath, mockPrediction.predictedBunches, mockPrediction.confidence]
    );

    console.log(`✅ Prediction complete: ${mockPrediction.predictedBunches} bunches (${mockPrediction.confidence * 100}% confidence)`);

    res.json({
      success: true,
      message: 'Prediction successful',
      data: mockPrediction
    });

  } catch (error) {
    console.error('Predict bunch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get bunch data
exports.getBunchData = async (req, res) => {
  try {
    const { bunchId } = req.params;

    const [bunches] = await pool.query(
      'SELECT * FROM bunches WHERE id = ?',
      [bunchId]
    );

    if (bunches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bunch not found'
      });
    }

    // Get prediction data if exists
    const [predictions] = await pool.query(
      'SELECT * FROM predictions WHERE bunchId = ? ORDER BY predictionDate DESC LIMIT 1',
      [bunchId]
    );

    res.json({
      success: true,
      data: {
        bunch: bunches[0],
        latestPrediction: predictions.length > 0 ? predictions[0] : null
      }
    });
  } catch (error) {
    console.error('Get bunch data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Get all bunches for a tree
exports.getBunchesByTree = async (req, res) => {
  try {
    const { treeId } = req.params;

    const [bunches] = await pool.query(
      'SELECT * FROM bunches WHERE treeId = ? ORDER BY createdAt DESC',
      [treeId]
    );

    res.json({
      success: true,
      count: bunches.length,
      data: bunches
    });
  } catch (error) {
    console.error('Get bunches by tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
