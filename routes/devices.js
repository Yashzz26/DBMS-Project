const express = require('express');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function validateDevice(body) {
  const customerId = parseId(body.customerId);
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
  const model = typeof body.model === 'string' ? body.model.trim() : '';

  if (!customerId || !type || !brand || !model) {
    return { error: 'customerId, type, brand, and model are required' };
  }

  return { device: { customerId, type, brand, model } };
}

router.use(requireAdmin);

router.post('/', async (req, res, next) => {
  try {
    const result = validateDevice(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const customer = await getDatabase().collection('customers')
      .findOne({ _id: result.device.customerId }, { projection: { _id: 1 } });
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const device = { ...result.device, createdAt: new Date(), updatedAt: new Date() };
    const insertResult = await getDatabase().collection('devices').insertOne(device);
    res.status(201).json({ ...device, _id: insertResult.insertedId });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.customerId) {
      const customerId = parseId(req.query.customerId);
      if (!customerId) {
        return res.status(400).json({ error: 'Invalid customer id' });
      }
      filter.customerId = customerId;
    }

    const devices = await getDatabase().collection('devices')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid device id' });
    }

    const device = await getDatabase().collection('devices').findOne({ _id: id });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid device id' });
    }

    const result = validateDevice(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const customer = await getDatabase().collection('customers')
      .findOne({ _id: result.device.customerId }, { projection: { _id: 1 } });
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const updateResult = await getDatabase().collection('devices').findOneAndUpdate(
      { _id: id },
      { $set: { ...result.device, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!updateResult) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(updateResult);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid device id' });
    }

    const deleteResult = await getDatabase().collection('devices').deleteOne({ _id: id });
    if (!deleteResult.deletedCount) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
