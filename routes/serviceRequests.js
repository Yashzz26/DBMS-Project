const express = require('express');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const statuses = ['pending', 'in-progress', 'completed', 'cancelled'];

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function validateRequest(body) {
  const customerId = parseId(body.customerId);
  const deviceId = parseId(body.deviceId);
  const issueDescription = typeof body.issueDescription === 'string'
    ? body.issueDescription.trim()
    : '';

  if (!customerId || !deviceId || !issueDescription) {
    return { error: 'customerId, deviceId, and issueDescription are required' };
  }

  return { request: { customerId, deviceId, issueDescription } };
}

async function referencesExist(request) {
  const database = getDatabase();
  const [customer, device] = await Promise.all([
    database.collection('customers').findOne({ _id: request.customerId }, { projection: { _id: 1 } }),
    database.collection('devices').findOne(
      { _id: request.deviceId, customerId: request.customerId },
      { projection: { _id: 1 } }
    )
  ]);
  return Boolean(customer && device);
}

async function insertServiceRecord(serviceRequest, body = {}) {
  const database = getDatabase();
  const cost = body.cost === undefined ? 0 : Number(body.cost);
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: 'cost must be a non-negative number' };
  }

  const existing = await database.collection('serviceRecords')
    .findOne({ serviceRequestId: serviceRequest._id });
  if (existing) {
    return { record: existing };
  }

  const record = {
    serviceRequestId: serviceRequest._id,
    customerId: serviceRequest.customerId,
    deviceId: serviceRequest.deviceId,
    cost,
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
    completedAt: new Date(),
    createdAt: new Date()
  };
  const result = await database.collection('serviceRecords').insertOne(record);
  return { record: { ...record, _id: result.insertedId } };
}

router.use(requireAdmin);

router.post('/', async (req, res, next) => {
  try {
    const result = validateRequest(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await referencesExist(result.request)) {
      return res.status(400).json({ error: 'Customer and device relationship not found' });
    }

    const request = {
      ...result.request,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const insertResult = await getDatabase().collection('serviceRequests').insertOne(request);
    res.status(201).json({ ...request, _id: insertResult.insertedId });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const requests = await getDatabase().collection('serviceRequests').aggregate([
      { $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer'
      } },
      { $lookup: {
        from: 'devices',
        localField: 'deviceId',
        foreignField: '_id',
        as: 'device'
      } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid service request id' });

    const request = await getDatabase().collection('serviceRequests').aggregate([
      { $match: { _id: id } },
      { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
      { $lookup: { from: 'devices', localField: 'deviceId', foreignField: '_id', as: 'device' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } }
    ]).next();
    if (!request) return res.status(404).json({ error: 'Service request not found' });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (!id) return res.status(400).json({ error: 'Invalid service request id' });
    if (!statuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${statuses.join(', ')}` });
    }
    if (status === 'completed') {
      const cost = req.body.cost === undefined ? 0 : Number(req.body.cost);
      if (!Number.isFinite(cost) || cost < 0) {
        return res.status(400).json({ error: 'cost must be a non-negative number' });
      }
    }

    const database = getDatabase();
    const request = await database.collection('serviceRequests').findOne({ _id: id });
    if (!request) return res.status(404).json({ error: 'Service request not found' });

    const updated = await database.collection('serviceRequests').findOneAndUpdate(
      { _id: id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (status === 'completed') {
      const recordResult = await insertServiceRecord(updated, req.body);
      if (recordResult.error) return res.status(400).json({ error: recordResult.error });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const result = validateRequest(req.body);
    if (!id) return res.status(400).json({ error: 'Invalid service request id' });
    if (result.error) return res.status(400).json({ error: result.error });
    if (!await referencesExist(result.request)) {
      return res.status(400).json({ error: 'Customer and device relationship not found' });
    }

    const updated = await getDatabase().collection('serviceRequests').findOneAndUpdate(
      { _id: id },
      { $set: result.request, updatedAt: new Date() },
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
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid service request id' });
    const result = await getDatabase().collection('serviceRequests').deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Service request not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
