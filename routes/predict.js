const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const PredictController = require('../controllers/predictController');

// POST /api/predict/generate - Create bunch and prediction
router.post(
  "/generate",
  upload.single("image"),
  PredictController.createPrediction
);

// GET /api/predict/bunch/:bunchId - Get prediction by bunch ID
router.get(
  "/bunch/:bunchId",
  PredictController.getPrediction
);

module.exports = router;