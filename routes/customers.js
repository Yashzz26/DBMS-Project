const express = require('express');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const collectionName = 'customers';

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function validateCustomer(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!name || !phone) {
    return { error: 'name and phone are required' };
  }

  return { customer: { name, phone, email } };
}

router.use(requireAdmin);

router.post('/', async (req, res, next) => {
  try {
    const result = validateCustomer(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const customer = { ...result.customer, createdAt: new Date(), updatedAt: new Date() };
    const insertResult = await getDatabase().collection(collectionName).insertOne(customer);
    res.status(201).json({ ...customer, _id: insertResult.insertedId });
  } catch (error) {
    next(error);
  }
});

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
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const customer = await getDatabase().collection(collectionName).findOne({ _id: id });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const result = validateCustomer(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const updateResult = await getDatabase().collection(collectionName).findOneAndUpdate(
      { _id: id },
      { $set: { ...result.customer, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!updateResult) {
      return res.status(404).json({ error: 'Customer not found' });
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
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const deleteResult = await getDatabase().collection(collectionName).deleteOne({ _id: id });
    if (!deleteResult.deletedCount) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
