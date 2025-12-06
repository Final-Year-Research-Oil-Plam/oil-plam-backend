const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const bunchController = require('../controllers/bunchController');

// Bunch endpoints
router.post('/', upload.single('photo'), bunchController.addBunch);
router.post('/predict', upload.single('photo'), bunchController.predictBunch);
router.get('/:bunchId', bunchController.getBunchData);
router.get('/tree/:treeId', bunchController.getBunchesByTree);

module.exports = router;
