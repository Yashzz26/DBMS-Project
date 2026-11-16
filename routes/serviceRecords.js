const express = require('express');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const records = await getDatabase().collection('serviceRecords').aggregate([
      { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
      { $lookup: { from: 'devices', localField: 'deviceId', foreignField: '_id', as: 'device' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
      { $sort: { completedAt: -1 } }
    ]).toArray();
    res.json(records);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const serviceRequestId = parseId(req.body.serviceRequestId);
    const cost = Number(req.body.cost);
    if (!serviceRequestId || !Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ error: 'serviceRequestId and a non-negative cost are required' });
    }

    const request = await getDatabase().collection('serviceRequests').findOne({ _id: serviceRequestId });
    if (!request) return res.status(400).json({ error: 'Service request not found' });

    const record = {
      serviceRequestId,
      customerId: request.customerId,
      deviceId: request.deviceId,
      cost,
      notes: typeof req.body.notes === 'string' ? req.body.notes.trim() : '',
      completedAt: new Date(),
      createdAt: new Date()
    };
    const result = await getDatabase().collection('serviceRecords').insertOne(record);
    res.status(201).json({ ...record, _id: result.insertedId });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid service record id' });
    const record = await getDatabase().collection('serviceRecords').findOne({ _id: id });
    if (!record) return res.status(404).json({ error: 'Service record not found' });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
