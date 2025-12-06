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
exports.predictBunch = async (req, res) => {
  try {
    const { block, treeId, bunchId } = req.body;
    const photoPath = req.file ? req.file.path : null;

    // Validation
    if (!block || !treeId || !bunchId) {
      return res.status(400).json({
        success: false,
        message: 'Block, tree ID, and bunch ID are required'
      });
    }

    if (!photoPath) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required for prediction'
      });
    }

    // Check if bunch exists
    const [bunches] = await pool.query(
      'SELECT id FROM bunches WHERE id = ? AND treeId = ?',
      [bunchId, treeId]
    );

    if (bunches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bunch not found'
      });
    }

    // TODO: Integrate with ML model for disease prediction
    // For now, return mock prediction
    const mockPrediction = {
      healthy: 0.85,
      diseased: 0.15,
      confidence: 0.92
    };

    // Store prediction in database
    const [result] = await pool.query(
      'INSERT INTO predictions (bunchId, treeId, photoPath, prediction, confidence, predictionDate) VALUES (?, ?, ?, ?, ?, NOW())',
      [bunchId, treeId, photoPath, JSON.stringify(mockPrediction), mockPrediction.confidence]
    );

    res.status(201).json({
      success: true,
      message: 'Prediction completed successfully',
      data: {
        id: result.insertId,
        block,
        treeId,
        bunchId,
        photoPath,
        prediction: mockPrediction,
        confidence: mockPrediction.confidence
      }
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
