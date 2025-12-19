const { pool } = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/trees/:treeId/generate-qr
 * Generate QR code for a tree
 * Returns QR code as base64 image and token
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { treeId } = req.params;

    // Check if tree exists
    const [trees] = await pool.query(
      'SELECT id, tree_number, block_id, qr_token FROM trees WHERE id = ?',
      [treeId]
    );

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }

    const tree = trees[0];

    // Generate unique QR token (UUID)
    const qrToken = uuidv4();

    // Update tree with QR token
    await pool.query(
      'UPDATE trees SET qr_token = ?, qr_generated_at = NOW() WHERE id = ?',
      [qrToken, treeId]
    );

    // Generate QR code image (base64)
    // QR contains: Full URL to public tree view page
    const publicUrl = `http://localhost:5173/tree/${tree.tree_number}`;
    const qrData = publicUrl; // URL for web access
    const qrCodeBase64 = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });

    console.log(`✅ QR generated for tree ${tree.tree_number}`);


    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        treeId: tree.id,
        treeNumber: tree.tree_number,
        blockId: tree.block_id,
        qrToken: qrToken,
        qrCodeImage: qrCodeBase64, // For immediate display/download
        qrData: qrData // What's encoded in the QR
      }
    });

  } catch (error) {
    console.error('❌ QR generation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message
    });
  }
};

/**
 * GET /api/trees/public/:treeNumber
 * Public endpoint to view tree details by scanning QR code
 * No authentication required
 * Tracks scan statistics
 */
exports.getTreeByQR = async (req, res) => {
  try {
    const { treeNumber } = req.params;

    // Get tree details with block info
    const [trees] = await pool.query(
      `SELECT 
        t.id,
        t.tree_number,
        t.block_id,
        t.latitude,
        t.longitude,
        t.place_id,
        t.planted_date,
        t.age,
        t.fertilizer_type,
        t.fertilizer_qty,
        t.last_fertilizer_date,
        t.last_pruning_date,
        t.last_weeding_date,
        t.scan_count,
        t.last_scanned_at,
        t.created_at,
        b.name as block_name,
        b.area_size as block_area
      FROM trees t
      LEFT JOIN blocks b ON t.block_id = b.id
      WHERE t.tree_number = ?`,
      [treeNumber]
    );

    if (trees.length === 0) {
      console.log('❌ Tree not found');
      return res.status(404).json({
        success: false,
        message: 'Tree not found. QR code may be invalid.'
      });
    }

    const tree = trees[0];
    console.log('✅ Tree found:', tree.tree_number);

    // Get latest bunches for harvest info
    console.log('🔍 Fetching bunch/harvest information...');
    const [bunches] = await pool.query(
      `SELECT 
        id,
        bunchNumber,
        stage,
        weight,
        notes,
        created_at
      FROM bunches
      WHERE treeId = ?
      ORDER BY created_at DESC
      LIMIT 5`,
      [tree.id]
    );

    console.log('📊 Found', bunches.length, 'bunches');

    // Update scan statistics
    await pool.query(
      'UPDATE trees SET scan_count = scan_count + 1, last_scanned_at = NOW() WHERE id = ?',
      [tree.id]
    );
    console.log('📈 Scan count updated:', (tree.scan_count || 0) + 1);

    // Calculate next harvest estimate (simple logic - can be enhanced)
    let nextHarvestEstimate = null;
    if (bunches.length > 0) {
      const lastHarvest = new Date(bunches[0].created_at);
      // Assume harvest cycle is ~15 days
      const nextDate = new Date(lastHarvest);
      nextDate.setDate(nextDate.getDate() + 15);
      nextHarvestEstimate = nextDate.toISOString().split('T')[0];
    }

    console.log('✅ PUBLIC VIEW - Tree details retrieved successfully');
    console.log('============================================\n');

    res.json({
      success: true,
      message: 'Tree details retrieved successfully',
      data: {
        tree: {
          id: tree.id,
          treeNumber: tree.tree_number,
          blockId: tree.block_id,
          blockName: tree.block_name,
          blockArea: tree.block_area,
          location: {
            latitude: tree.latitude,
            longitude: tree.longitude,
            placeId: tree.place_id
          },
          plantedDate: tree.planted_date,
          age: tree.age,
          fertilizer: {
            type: tree.fertilizer_type,
            quantity: tree.fertilizer_qty,
            lastApplied: tree.last_fertilizer_date
          },
          maintenance: {
            lastPruning: tree.last_pruning_date,
            lastWeeding: tree.last_weeding_date
          },
          scanInfo: {
            totalScans: (tree.scan_count || 0) + 1,
            lastScanned: tree.last_scanned_at
          },
          createdAt: tree.created_at
        },
        harvest: {
          recentBunches: bunches,
          totalBunches: bunches.length,
          lastHarvestDate: bunches.length > 0 ? bunches[0].created_at : null,
          nextHarvestEstimate: nextHarvestEstimate
        }
      }
    });

  } catch (error) {
    console.error('❌ ============ ERROR ============');
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tree details',
      error: error.message
    });
  }
};

/**
 * GET /api/trees/:treeId/qr-stats
 * Get QR code scan statistics for a tree
 */
exports.getQRStats = async (req, res) => {
  console.log('\n📊 ============ QR STATS REQUEST ============');
  console.log('📦 Tree ID:', req.params.treeId);

  try {
    const { treeId } = req.params;

    const [trees] = await pool.query(
      `SELECT 
        id,
        tree_number,
        qr_token,
        qr_generated_at,
        scan_count,
        last_scanned_at
      FROM trees
      WHERE id = ?`,
      [treeId]
    );

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tree not found'
      });
    }

    const tree = trees[0];

    console.log('✅ Stats retrieved:', {
      treeNumber: tree.tree_number,
      scanCount: tree.scan_count,
      hasQR: !!tree.qr_token
    });

    res.json({
      success: true,
      data: {
        treeId: tree.id,
        treeNumber: tree.tree_number,
        hasQRCode: !!tree.qr_token,
        qrGeneratedAt: tree.qr_generated_at,
        scanCount: tree.scan_count || 0,
        lastScannedAt: tree.last_scanned_at
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR stats',
      error: error.message
    });
  }
};

/**
 * GET /api/trees/bulk-qr
 * Generate QR codes for multiple trees (for bulk printing from web dashboard)
 * Query params: ?blockId=BLOCK-A (optional)
 */
exports.bulkGenerateQR = async (req, res) => {
  console.log('\n🖨️ ============ BULK QR GENERATION ============');
  console.log('📦 Query params:', req.query);

  try {
    const { blockId } = req.query;
    
    let query = 'SELECT id, tree_number, block_id, qr_token FROM trees WHERE 1=1';
    const params = [];

    if (blockId) {
      query += ' AND block_id = ?';
      params.push(blockId);
      console.log('🔍 Filtering by block:', blockId);
    }

    query += ' ORDER BY tree_number ASC';

    const [trees] = await pool.query(query, params);
    console.log('📊 Found', trees.length, 'trees');

    if (trees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No trees found'
      });
    }

    // Generate QR codes for all trees
    const qrCodes = [];
    
    for (const tree of trees) {
      // Generate or reuse QR token
      let qrToken = tree.qr_token;
      
      if (!qrToken) {
        qrToken = uuidv4();
        await pool.query(
          'UPDATE trees SET qr_token = ?, qr_generated_at = NOW() WHERE id = ?',
          [qrToken, tree.id]
        );
      }

      // Generate QR code with public URL
      const publicUrl = `http://localhost:5173/tree/${tree.tree_number}`;
      const qrData = publicUrl;
      const qrCodeBase64 = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      qrCodes.push({
        treeId: tree.id,
        treeNumber: tree.tree_number,
        blockId: tree.block_id,
        qrToken: qrToken,
        qrCodeImage: qrCodeBase64,
        qrData: qrData
      });
    }

    console.log('✅ Generated', qrCodes.length, 'QR codes');
    console.log('============================================\n');

    res.json({
      success: true,
      message: `Generated ${qrCodes.length} QR codes`,
      count: qrCodes.length,
      data: {
        trees: qrCodes
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bulk QR codes',
      error: error.message
    });
  }
};
