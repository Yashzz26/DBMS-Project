function parseNumericId(value, fieldName) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { error: `Invalid ${fieldName}` };
  }

  return { value: id };
}

async function nextNumericId(collection, fieldName) {
  const latest = await collection
    .find({ [fieldName]: { $type: 'number' } })
    .sort({ [fieldName]: -1 })
    .limit(1)
    .next();
  let nextId = latest ? Number(latest[fieldName]) + 1 : 1;

  while (await collection.findOne({ [fieldName]: nextId }, { projection: { _id: 1 } })) {
    nextId += 1;
  }

  return nextId;
}

module.exports = { nextNumericId, parseNumericId };
