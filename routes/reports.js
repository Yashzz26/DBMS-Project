const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
router.use(requireAdmin);

router.get('/device-stats', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('serviceRequests').aggregate([
      // Join each request to its registered device.
      { $lookup: { from: 'devices', localField: 'deviceId', foreignField: '_id', as: 'device' } },
      // Ignore requests whose device reference no longer exists.
      { $unwind: '$device' },
      // Count requests and completed requests for each device type.
      { $group: {
        _id: '$device.type',
        totalRequests: { $sum: 1 },
        completedRequests: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      } },
      // Show the busiest device types first.
      { $sort: { totalRequests: -1, _id: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/pending', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('serviceRequests').aggregate([
      // Keep only repairs that still need work.
      { $match: { status: { $in: ['pending', 'in-progress'] } } },
      // Add customer and device details for the report table.
      { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
      { $lookup: { from: 'devices', localField: 'deviceId', foreignField: '_id', as: 'device' } },
      { $unwind: '$customer' },
      { $unwind: '$device' },
      // Oldest pending repair gets attention first.
      { $sort: { createdAt: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/status-summary', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('serviceRequests').aggregate([
      // Group all requests by their lifecycle status.
      { $group: { _id: '$status', count: { $sum: 1 } } },
      // Return a stable, readable order for the dashboard.
      { $sort: { _id: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/revenue', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('serviceRecords').aggregate([
      // Aggregate completed service record costs into one summary.
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$cost' },
        averageCost: { $avg: '$cost' },
        completedServices: { $sum: 1 }
      } },
      // Hide the technical grouping key from the API response.
      { $project: { _id: 0, totalRevenue: 1, averageCost: 1, completedServices: 1 } }
    ]).toArray();
    res.json(report[0] || { totalRevenue: 0, averageCost: 0, completedServices: 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
