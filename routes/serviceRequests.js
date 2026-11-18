const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { nextNumericId, parseNumericId } = require('./helpers');

const router = express.Router();
const collectionName = 'service_requests';
const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const priorities = ['Low', 'Medium', 'High'];

function validateRequest(body) {
  const customer = parseNumericId(body.customer_id, 'customer_id');
  const device = parseNumericId(body.device_id, 'device_id');
  const issue = typeof body.issue === 'string' ? body.issue.trim() : '';
  const status = body.status === undefined ? 'Pending' : String(body.status).trim();
  const priority = body.priority === undefined ? 'Medium' : String(body.priority).trim();
  const estimatedCost = body.estimated_cost === undefined ? 0 : Number(body.estimated_cost);
  const requestDate = body.request_date ? new Date(body.request_date) : new Date();

  if (customer.error || device.error || !issue || !statuses.includes(status)
    || !priorities.includes(priority) || !Number.isFinite(estimatedCost)
    || estimatedCost < 0 || Number.isNaN(requestDate.getTime())) {
    return { error: 'customer_id, device_id, issue, valid status, priority, request_date, and non-negative estimated_cost are required' };
  }

  return {
    request: {
      customer_id: customer.value,
      device_id: device.value,
      issue,
      status,
      priority,
      request_date: requestDate,
      estimated_cost: estimatedCost
    }
  };
}

async function referencesExist(request) {
  const database = getDatabase();
  const [customer, device] = await Promise.all([
    database.collection('customers').findOne({ customer_id: request.customer_id }, { projection: { _id: 1 } }),
    database.collection('devices').findOne(
      { device_id: request.device_id, customer_id: request.customer_id },
      { projection: { _id: 1 } }
    )
  ]);
  return Boolean(customer && device);
}

function withRelatedDocuments() {
  return [
    { $lookup: { from: 'customers', localField: 'customer_id', foreignField: 'customer_id', as: 'customer' } },
    { $lookup: { from: 'devices', localField: 'device_id', foreignField: 'device_id', as: 'device' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } }
  ];
}

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const requests = await getDatabase().collection(collectionName).aggregate([
      ...withRelatedDocuments(),
      { $sort: { request_date: -1, request_id: -1 } }
    ]).toArray();
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service request id');
    if (parsed.error) return res.status(400).json(parsed);

    const request = await getDatabase().collection(collectionName).aggregate([
      { $match: { request_id: parsed.value } },
      ...withRelatedDocuments()
    ]).next();
    if (!request) return res.status(404).json({ error: 'Service request not found' });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = validateRequest(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await referencesExist(result.request)) {
      return res.status(400).json({ error: 'Customer and device relationship not found' });
    }

    const collection = getDatabase().collection(collectionName);
    const request = {
      request_id: await nextNumericId(collection, 'request_id'),
      ...result.request
    };
    await collection.insertOne(request);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service request id');
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (parsed.error) return res.status(400).json(parsed);
    if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updated = await getDatabase().collection(collectionName).findOneAndUpdate(
      { request_id: parsed.value },
      { $set: { status } },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Service request not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service request id');
    if (parsed.error) return res.status(400).json(parsed);
    const result = validateRequest(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await referencesExist(result.request)) {
      return res.status(400).json({ error: 'Customer and device relationship not found' });
    }

    const updated = await getDatabase().collection(collectionName).findOneAndUpdate(
      { request_id: parsed.value },
      { $set: result.request },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Service request not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'service request id');
    if (parsed.error) return res.status(400).json(parsed);

    const result = await getDatabase().collection(collectionName)
      .deleteOne({ request_id: parsed.value });
    if (!result.deletedCount) return res.status(404).json({ error: 'Service request not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
