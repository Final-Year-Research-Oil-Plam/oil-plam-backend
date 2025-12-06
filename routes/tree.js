const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');

// CRUD endpoints for trees
router.post('/', treeController.addTree);
router.get('/:treeId', treeController.getTree);
router.get('/', treeController.searchTree);
router.put('/:treeId', treeController.updateTree);
router.delete('/:treeId', treeController.deleteTree);

module.exports = router;
