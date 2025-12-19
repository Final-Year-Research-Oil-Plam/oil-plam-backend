const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

// QR Code endpoints
router.post('/:treeId/generate-qr', qrController.generateQRCode);     // POST /api/qr/:treeId/generate-qr - Generate QR for single tree
router.get('/bulk-qr', qrController.bulkGenerateQR);                  // GET /api/qr/bulk-qr?blockId=BLOCK-A - Bulk generate for web dashboard
router.get('/public/:treeNumber', qrController.getTreeByQR);          // GET /api/qr/public/:treeNumber - Public view (no auth)
router.get('/:treeId/stats', qrController.getQRStats);                // GET /api/qr/:treeId/stats - Get scan statistics

module.exports = router;
