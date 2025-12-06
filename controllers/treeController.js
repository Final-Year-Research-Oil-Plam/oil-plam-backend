const { pool } = require('../config/db');

// Add new tree
exports.addTree = async (req, res) => {
  try {
    const { block, treeNumber, variety, plantedDate, notes } = req.body;
    const userId = req.user?.id; // Assuming auth middleware adds user info

    // Validation
    if (!block || !treeNumber) {
      return res.status(400).json({
        success: false,
        message: 'Block and tree number are required'
      });
    }

    // Check if tree already exists
    const [existingTree] = await pool.query(
      'SELECT id FROM trees WHERE block = ? AND treeNumber = ?',
      [block, treeNumber]
    );

    if (existingTree.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tree already exists in this block'
      });
    }

    // Insert tree
    const [result] = await pool.query(
      'INSERT INTO trees (userId, block, treeNumber, variety, plantedDate, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, block, treeNumber, variety || null, plantedDate || null, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Tree added successfully',
      data: {
        id: result.insertId,
        block,
        treeNumber,
        variety,
        plantedDate,
        notes
      }
    });
  } catch (error) {
    console.error('Add tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get tree by ID
exports.getTree = async (req, res) => {
  try {
    const { treeId } = req.params;

    const [trees] = await pool.query(
      'SELECT * FROM trees WHERE id = ?',
      [treeId]
    );

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }

    res.json({
      success: true,
      data: trees[0]
    });
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Search trees
exports.searchTree = async (req, res) => {
  try {
    const { block, treeNumber, variety } = req.query;
    let query = 'SELECT * FROM trees WHERE 1=1';
    const params = [];

    if (block) {
      query += ' AND block = ?';
      params.push(block);
    }

    if (treeNumber) {
      query += ' AND treeNumber = ?';
      params.push(treeNumber);
    }

    if (variety) {
      query += ' AND variety = ?';
      params.push(variety);
    }

    const [trees] = await pool.query(query, params);

    res.json({
      success: true,
      count: trees.length,
      data: trees
    });
  } catch (error) {
    console.error('Search tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Update tree
exports.updateTree = async (req, res) => {
  try {
    const { treeId } = req.params;
    const { block, treeNumber, variety, plantedDate, notes } = req.body;

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

    await pool.query(
      'UPDATE trees SET block = ?, treeNumber = ?, variety = ?, plantedDate = ?, notes = ? WHERE id = ?',
      [block, treeNumber, variety, plantedDate, notes, treeId]
    );

    res.json({
      success: true,
      message: 'Tree updated successfully',
      data: {
        id: treeId,
        block,
        treeNumber,
        variety,
        plantedDate,
        notes
      }
    });
  } catch (error) {
    console.error('Update tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Delete tree
exports.deleteTree = async (req, res) => {
  try {
    const { treeId } = req.params;

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

    await pool.query('DELETE FROM trees WHERE id = ?', [treeId]);

    res.json({
      success: true,
      message: 'Tree deleted successfully'
    });
  } catch (error) {
    console.error('Delete tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
