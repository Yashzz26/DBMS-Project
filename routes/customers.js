const express = require('express');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { nextNumericId, parseNumericId } = require('./helpers');

const router = express.Router();
const collectionName = 'customers';

function validateCustomer(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';

  if (!name || !phone || !city) {
    return { error: 'name, phone, and city are required' };
  }

  return { customer: { name, phone, email, city } };
}

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const customers = await getDatabase().collection(collectionName)
      .find({})
      .sort({ name: 1 })
      .toArray();
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'customer id');
    if (parsed.error) return res.status(400).json(parsed);

    const customer = await getDatabase().collection(collectionName)
      .findOne({ customer_id: parsed.value });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = validateCustomer(req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    const collection = getDatabase().collection(collectionName);
    const customer = {
      customer_id: await nextNumericId(collection, 'customer_id'),
      ...result.customer
    };
    await collection.insertOne(customer);
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'customer id');
    if (parsed.error) return res.status(400).json(parsed);
    const result = validateCustomer(req.body);
    if (result.error) return res.status(400).json({ error: result.error });

    const updated = await getDatabase().collection(collectionName).findOneAndUpdate(
      { customer_id: parsed.value },
      { $set: result.customer },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const parsed = parseNumericId(req.params.id, 'customer id');
    if (parsed.error) return res.status(400).json(parsed);

    const result = await getDatabase().collection(collectionName)
      .deleteOne({ customer_id: parsed.value });
    if (!result.deletedCount) return res.status(404).json({ error: 'Customer not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
