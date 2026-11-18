const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'DBMS-Project';
const client = new MongoClient(mongoUri);

let database;

async function connectToDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(dbName);
  }

  return database;
}

function getDatabase() {
  if (!database) {
    throw new Error('Database connection has not been established');
  }

  return database;
}

async function closeDatabase() {
  await client.close();
  database = undefined;
}

module.exports = {
  closeDatabase,
  connectToDatabase,
  getDatabase
};
