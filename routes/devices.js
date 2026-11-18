const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { nextNumericId, parseNumericId } = require('./helpers');

const router = express.Router();
const collectionName = 'devices';

function validateDevice(body) {
  const customer = parseNumericId(body.customer_id, 'customer_id');
  const device_type = typeof body.device_type === 'string' ? body.device_type.trim() : '';
  const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  const problem = typeof body.problem === 'string' ? body.problem.trim() : '';

  if (customer.error || !device_type || !brand || !model || !problem) {
    return { error: 'customer_id, device_type, brand, model, and problem are required' };
  }

  return { device: { customer_id: customer.value, device_type, brand, model, problem } };
}

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.customer_id !== undefined) {
      const parsed = parseNumericId(req.query.customer_id, 'customer_id');
      if (parsed.error) return res.status(400).json(parsed);
      filter.customer_id = parsed.value;
    }

    const devices = await getDatabase().collection(collectionName)
      .find(filter)
      .sort({ device_id: 1 })
      .toArray();
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'device id');
    if (parsed.error) return res.status(400).json(parsed);

    const device = await getDatabase().collection(collectionName)
      .findOne({ device_id: parsed.value });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = validateDevice(req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    const database = getDatabase();
    const customer = await database.collection('customers')
      .findOne({ customer_id: result.device.customer_id }, { projection: { _id: 1 } });
    if (!customer) return res.status(400).json({ error: 'Customer not found' });

    const collection = database.collection(collectionName);
    const device = {
      device_id: await nextNumericId(collection, 'device_id'),
      ...result.device
    };
    await collection.insertOne(device);
    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'device id');
    if (parsed.error) return res.status(400).json(parsed);
    const result = validateDevice(req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    const database = getDatabase();
    const customer = await database.collection('customers')
      .findOne({ customer_id: result.device.customer_id }, { projection: { _id: 1 } });
    if (!customer) return res.status(400).json({ error: 'Customer not found' });

    const updated = await database.collection(collectionName).findOneAndUpdate(
      { device_id: parsed.value },
      { $set: result.device },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Device not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'device id');
    if (parsed.error) return res.status(400).json(parsed);

    const result = await getDatabase().collection(collectionName)
      .deleteOne({ device_id: parsed.value });
    if (!result.deletedCount) return res.status(404).json({ error: 'Device not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
