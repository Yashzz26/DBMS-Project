const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
router.use(requireAdmin);

router.get('/repair-status', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_requests').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/device-statistics', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_requests').aggregate([
      { $lookup: {
        from: 'devices',
        localField: 'device_id',
        foreignField: 'device_id',
        as: 'device'
      } },
      { $unwind: '$device' },
      { $group: {
        _id: '$device.device_type',
        totalRequests: { $sum: 1 },
        completedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
      } },
      { $sort: { totalRequests: -1, _id: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/pending-repairs', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_requests').aggregate([
      { $match: { status: { $in: ['Pending', 'In Progress'] } } },
      { $lookup: { from: 'customers', localField: 'customer_id', foreignField: 'customer_id', as: 'customer' } },
      { $lookup: { from: 'devices', localField: 'device_id', foreignField: 'device_id', as: 'device' } },
      { $unwind: '$customer' },
      { $unwind: '$device' },
      { $sort: { request_date: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get('/average-cost', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_requests').aggregate([
      { $group: {
        _id: null,
        averageEstimatedCost: { $avg: '$estimated_cost' },
        totalRequests: { $sum: 1 }
      } },
      { $project: { _id: 0, averageEstimatedCost: 1, totalRequests: 1 } }
    ]).next();
    res.json(report || { averageEstimatedCost: 0, totalRequests: 0 });
  } catch (error) {
    next(error);
  }
});

router.get('/high-priority', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_requests').aggregate([
      { $match: { priority: 'High' } },
      { $lookup: { from: 'customers', localField: 'customer_id', foreignField: 'customer_id', as: 'customer' } },
      { $lookup: { from: 'devices', localField: 'device_id', foreignField: 'device_id', as: 'device' } },
      { $unwind: '$customer' },
      { $unwind: '$device' },
      { $sort: { request_date: 1 } }
    ]).toArray();
    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Keep the original report URLs working for existing bookmarks.
router.get('/device-stats', (req, res) => res.redirect('/api/reports/device-statistics'));
router.get('/pending', (req, res) => res.redirect('/api/reports/pending-repairs'));
router.get('/status-summary', (req, res) => res.redirect('/api/reports/repair-status'));
router.get('/revenue', async (req, res, next) => {
  try {
    const report = await getDatabase().collection('service_records').aggregate([
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$service_cost' },
        averageCost: { $avg: '$service_cost' },
        completedServices: { $sum: 1 }
      } },
      { $project: { _id: 0, totalRevenue: 1, averageCost: 1, completedServices: 1 } }
    ]).next();
    res.json(report || { totalRevenue: 0, averageCost: 0, completedServices: 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
