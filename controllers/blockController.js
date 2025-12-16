const { pool } = require('../config/db');

/**
 * GET /api/blocks
 * Fetch all blocks for dropdown selection
 * Returns blocks in format: { id, name, areaSize }
 */
exports.getAllBlocks = async (req, res) => {
  console.log('\n🔍 [BLOCKS API] Request received at:', new Date().toISOString());
  console.log('📍 [BLOCKS API] Endpoint: GET /blocks');
  
  try {
    console.log('💾 [BLOCKS API] Querying database for blocks...');
    
    // Query blocks table and map snake_case to camelCase for frontend
    const [blocks] = await pool.query(
      'SELECT id, name, area_size as areaSize FROM blocks ORDER BY id ASC'
    );
    
    console.log('✅ [BLOCKS API] Database query successful');
    console.log('📊 [BLOCKS API] Number of blocks found:', blocks.length);
    console.log('📦 [BLOCKS API] Blocks data:', JSON.stringify(blocks, null, 2));
    
    const response = {
      success: true,
      message: 'Blocks fetched successfully',
      data: blocks
    };
    
    console.log('📤 [BLOCKS API] Sending response to frontend:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (error) {
    console.error('❌ [BLOCKS API] Error fetching blocks:', error);
    console.error('❌ [BLOCKS API] Error details:', error.message);
    console.error('❌ [BLOCKS API] Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blocks',
      error: error.message
    });
  }
};
