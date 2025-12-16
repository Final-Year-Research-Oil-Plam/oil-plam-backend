const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');

// Block endpoints
router.get('/', blockController.getAllBlocks); // GET /api/blocks - Get all blocks

module.exports = router;
