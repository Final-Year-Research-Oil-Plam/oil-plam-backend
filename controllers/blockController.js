const { pool } = require('../config/db');

/**
 * GET /api/blocks
 * Fetch all blocks for dropdown selection
 * Returns blocks in format: { id, name, areaSize }
 */
exports.getAllBlocks = async (req, res) => {
  try {
    // Query blocks table and map snake_case to camelCase for frontend
    const [blocks] = await pool.query(
      'SELECT id, name, area_size as areaSize FROM blocks ORDER BY id ASC'
    );
    
    console.log(`✅ GET /blocks - ${blocks.length} blocks found`);
    
    res.json({
      success: true,
      message: 'Blocks fetched successfully',
      data: blocks
    });
  } catch (error) {
    console.error('❌ Error fetching blocks:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blocks',
      error: error.message
    });
  }
};

/**
 * POST /api/blocks
 * Create a new block
 */
exports.addBlock = async (req, res) => {
  try {
    const { id, name, areaSize } = req.body;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'Block id and name are required' });
    }

    await pool.query(
      'INSERT INTO blocks (id, name, area_size) VALUES (?, ?, ?)',
      [id, name, areaSize || null]
    );

    console.log(`✅ POST /blocks - block ${id} created`);

    res.json({ success: true, message: 'Block created successfully', data: { id, name, areaSize } });
  } catch (error) {
    console.error('❌ Error creating block:', error.message);
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Block with this ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create block', error: error.message });
  }
};

/**
 * PUT /api/blocks/:blockId
 * Update block details
 */
exports.updateBlock = async (req, res) => {
  try {
    const { blockId } = req.params;
    const { name, areaSize } = req.body;

    if (!blockId) {
      return res.status(400).json({ success: false, message: 'Block ID is required' });
    }

    const [result] = await pool.query(
      'UPDATE blocks SET name = ?, area_size = ? WHERE id = ?',
      [name || null, areaSize || null, blockId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Block not found' });
    }

    console.log(`✅ PUT /blocks/${blockId} - block updated`);

    res.json({ success: true, message: 'Block updated successfully', data: { id: blockId, name, areaSize } });
  } catch (error) {
    console.error('❌ Error updating block:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update block', error: error.message });
  }
};
