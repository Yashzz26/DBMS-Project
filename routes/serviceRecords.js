const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { nextNumericId, parseNumericId } = require('./helpers');

const router = express.Router();
const collectionName = 'service_records';

function validateRecord(body) {
  const request = parseNumericId(body.request_id, 'request_id');
  const technician = typeof body.technician === 'string' ? body.technician.trim() : '';
  const repairAction = typeof body.repair_action === 'string' ? body.repair_action.trim() : '';
  const repairStatus = typeof body.repair_status === 'string' ? body.repair_status.trim() : '';
  const serviceCost = Number(body.service_cost);

  if (request.error || !technician || !repairAction || !repairStatus
    || !Number.isFinite(serviceCost) || serviceCost < 0) {
    return { error: 'request_id, technician, repair_action, repair_status, and non-negative service_cost are required' };
  }

  return { record: { request_id: request.value, technician, repair_action: repairAction, repair_status: repairStatus, service_cost: serviceCost } };
}

async function relatedRequestExists(requestId) {
  return Boolean(await getDatabase().collection('service_requests')
    .findOne({ request_id: requestId }, { projection: { _id: 1 } }));
}

function withRelatedDocuments() {
  return [
    { $lookup: { from: 'service_requests', localField: 'request_id', foreignField: 'request_id', as: 'request' } },
    { $unwind: { path: '$request', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'devices', localField: 'request.device_id', foreignField: 'device_id', as: 'device' } },
    { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'customers', localField: 'request.customer_id', foreignField: 'customer_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
  ];
}

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const records = await getDatabase().collection(collectionName).aggregate([
      ...withRelatedDocuments(),
      { $sort: { record_id: -1 } }
    ]).toArray();
    res.json(records);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service record id');
    if (parsed.error) return res.status(400).json(parsed);

    const record = await getDatabase().collection(collectionName)
      .findOne({ record_id: parsed.value });
    if (!record) return res.status(404).json({ error: 'Service record not found' });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = validateRecord(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await relatedRequestExists(result.record.request_id)) {
      return res.status(400).json({ error: 'Service request not found' });
    }

    const collection = getDatabase().collection(collectionName);
    const record = {
      record_id: await nextNumericId(collection, 'record_id'),
      ...result.record
    };
    await collection.insertOne(record);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service record id');
    if (parsed.error) return res.status(400).json(parsed);
    const result = validateRecord(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await relatedRequestExists(result.record.request_id)) {
      return res.status(400).json({ error: 'Service request not found' });
    }

    const updated = await getDatabase().collection(collectionName).findOneAndUpdate(
      { record_id: parsed.value },
      { $set: result.record },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Service record not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service record id');
    if (parsed.error) return res.status(400).json(parsed);

    const result = await getDatabase().collection(collectionName)
      .deleteOne({ record_id: parsed.value });
    if (!result.deletedCount) return res.status(404).json({ error: 'Service record not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
