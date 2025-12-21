const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const blockController = require('../controllers/blockController');

// Block endpoints (must be before /:treeId to avoid route conflicts)
router.get('/blocks', blockController.getAllBlocks); // GET /api/trees/blocks - Get all blocks for dropdown

// Tree CRUD endpoints
router.post('/add', treeController.addTree); // POST /api/trees/add - Add new tree
router.get('/by-block/:blockId', treeController.getTreesByBlock); // GET /api/trees/by-block/:blockId - Get trees by block (for cascading dropdown)
router.get('/', treeController.searchTree); // GET /api/trees - Search/list trees (must be before /:treeId)
router.get('/:treeId', treeController.getTree); // GET /api/trees/:treeId - Get tree by ID
router.put('/:treeId', treeController.updateTree); // PUT /api/trees/:treeId - Update tree
router.delete('/:treeId', treeController.deleteTree); // DELETE /api/trees/:treeId - Delete tree

module.exports = router;
