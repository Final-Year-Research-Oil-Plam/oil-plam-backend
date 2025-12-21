const { pool } = require('../config/db');

/**
 * POST /api/trees/add
 * Add new tree to database
 * - Validates blockId
 * - Auto-generates tree_number
 * - Maps camelCase → snake_case
 */
exports.addTree = async (req, res) => {
  console.log('\n🌳 ============ ADD TREE REQUEST ============');
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('⏰ Time:', new Date().toISOString());
  
  try {
    const {
      blockId,
      treeNumber,
      latitude,
      longitude,
      placeId,
      plantedDate,
      age,
      fertilizerType,
      fertilizerQty,
      lastFertilizerDate,
      lastPruningDate,
      lastWeedingDate
    } = req.body;

    console.log('🔍 Checking blockId:', blockId);
    
    if (!blockId) {
      console.log('❌ VALIDATION ERROR: Missing blockId');
      return res.status(400).json({
        success: false,
        message: 'Block ID is required'
      });
    }

    // Validate block exists
    console.log('🔍 Validating block exists in database...');
    const [blocks] = await pool.query(
      'SELECT id FROM blocks WHERE id = ?',
      [blockId]
    );

    console.log('📊 Blocks found:', blocks.length);
    if (blocks.length > 0) {
      console.log('✅ Block validated:', blocks[0]);
    }

    if (blocks.length === 0) {
      console.log('❌ VALIDATION ERROR: Block not found');
      return res.status(400).json({
        success: false,
        message: 'Block not found'
      });
    }

    // Auto-generate tree number if not provided
    let finalTreeNumber = treeNumber;
    if (!finalTreeNumber) {
      console.log('🔢 Auto-generating tree number...');
      const [lastTree] = await pool.query(
        'SELECT tree_number FROM trees WHERE block_id = ? ORDER BY created_at DESC LIMIT 1',
        [blockId]
      );

      console.log('📝 Last tree found:', lastTree.length > 0 ? lastTree[0].tree_number : 'None');
      
      const lastSeq = lastTree.length > 0
        ? parseInt(lastTree[0].tree_number.split('-').pop(), 10)
        : 0;

      finalTreeNumber = `TREE-${blockId}-${String(lastSeq + 1).padStart(3, '0')}`;
      console.log('✅ Generated tree number:', finalTreeNumber);
    }

    console.log('💾 Inserting tree into database...');
    console.log('📊 Insert values:', {
      blockId,
      finalTreeNumber,
      latitude: latitude || null,
      longitude: longitude || null,
      placeId: placeId || null,
      plantedDate: plantedDate || null,
      age: age || null,
      fertilizerType: fertilizerType || null,
      fertilizerQty: fertilizerQty || null,
      lastFertilizerDate: lastFertilizerDate || null,
      lastPruningDate: lastPruningDate || null,
      lastWeedingDate: lastWeedingDate || null
    });
    
    const [result] = await pool.query(
      `INSERT INTO trees (
        block_id, tree_number, latitude, longitude, place_id,
        planted_date, age, fertilizer_type, fertilizer_qty,
        last_fertilizer_date, last_pruning_date, last_weeding_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        blockId,
        finalTreeNumber,
        latitude || null,
        longitude || null,
        placeId || null,
        plantedDate || null,
        age || null,
        fertilizerType || null,
        fertilizerQty || null,
        lastFertilizerDate || null,
        lastPruningDate || null,
        lastWeedingDate || null
      ]
    );

    console.log('✅ SUCCESS! Tree inserted with ID:', result.insertId);
    console.log('============================================\n');

    res.status(201).json({
      success: true,
      message: 'Tree added successfully',
      data: {
        id: result.insertId,
        treeNumber: finalTreeNumber,
        blockId
      }
    });

  } catch (error) {
    console.error('❌ ============ ERROR ============');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tree',
      error: error.message
    });
  }
};

/**
 * GET /api/trees/:treeId
 */
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
      message: 'Server error'
    });
  }
};

/**
 * GET /api/trees
 * Search trees
 */
/**
 * GET /api/trees/by-block/:blockId
 * Get trees for a specific block (for dropdown)
 * Returns: { id, tree_number } only for dropdown efficiency
 */
exports.getTreesByBlock = async (req, res) => {
  try {
    const { blockId } = req.params;

    if (!blockId) {
      return res.status(400).json({
        success: false,
        message: 'Block ID is required'
      });
    }

    // Query only essential fields for dropdown
    const [trees] = await pool.query(
      'SELECT id, tree_number as treeNumber, block_id as blockId FROM trees WHERE block_id = ? ORDER BY tree_number ASC',
      [blockId]
    );

    console.log(`✅ GET /trees by block ${blockId} - ${trees.length} trees found`);

    res.json({
      success: true,
      message: 'Trees fetched successfully',
      count: trees.length,
      data: trees
    });
  } catch (error) {
    console.error('❌ Error fetching trees by block:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trees',
      error: error.message
    });
  }
};

exports.searchTree = async (req, res) => {
  try {
    const { blockId, treeNumber } = req.query;

    let query = 'SELECT * FROM trees WHERE 1=1';
    const params = [];

    if (blockId) {
      query += ' AND block_id = ?';
      params.push(blockId);
    }

    if (treeNumber) {
      query += ' AND tree_number = ?';
      params.push(treeNumber);
    }

    query += ' ORDER BY tree_number ASC';

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
      message: 'Server error'
    });
  }
};

/**
 * PUT /api/trees/:treeId
 * Update tree
 */
exports.updateTree = async (req, res) => {
  try {
    const { treeId } = req.params;
    const {
      blockId,
      treeNumber,
      plantedDate,
      fertilizerType,
      fertilizerQty
    } = req.body;

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
      `UPDATE trees SET
        block_id = ?,
        tree_number = ?,
        planted_date = ?,
        fertilizer_type = ?,
        fertilizer_qty = ?
       WHERE id = ?`,
      [
        blockId,
        treeNumber,
        plantedDate || null,
        fertilizerType || null,
        fertilizerQty || null,
        treeId
      ]
    );

    res.json({
      success: true,
      message: 'Tree updated successfully'
    });
  } catch (error) {
    console.error('Update tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * DELETE /api/trees/:treeId
 */
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

    await pool.query(
      'DELETE FROM trees WHERE id = ?',
      [treeId]
    );

    res.json({
      success: true,
      message: 'Tree deleted successfully'
    });
  } catch (error) {
    console.error('Delete tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
