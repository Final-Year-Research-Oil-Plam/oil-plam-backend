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

// GET /api/predict/all - Get all predictions with pagination (for dashboard)
router.get(
  "/all",
  PredictController.getAllPredictions
);

// GET /api/predict/recent - Get recent predictions (for dashboard overview)
router.get(
  "/recent",
  PredictController.getRecentPredictions
);

// GET /api/predict/stats - Get prediction statistics (for dashboard)
router.get(
  "/stats",
  PredictController.getPredictionStats
);

// GET /api/predict/tree/:treeId/bunches - Get bunches by tree ID
router.get(
  "/tree/:treeId/bunches",
  PredictController.getBunchesByTree
);

// GET /api/predict/detail/:predictionId - Get detailed prediction by ID
router.get(
  "/detail/:predictionId",
  PredictController.getPredictionDetail
);

module.exports = router;