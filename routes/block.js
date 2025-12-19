const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');

// Block endpoints
router.get('/', blockController.getAllBlocks); // GET /api/blocks - Get all blocks

// Create a new block
router.post('/', blockController.addBlock); // POST /api/blocks - Create block

// Update existing block
router.put('/:blockId', blockController.updateBlock); // PUT /api/blocks/:blockId - Update block

module.exports = router;
