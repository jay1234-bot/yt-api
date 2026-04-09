const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function getDB() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env var not set');
  if (!client) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    await client.connect();
  }
  db = client.db('cet_tracker');
  return db;
}

module.exports = { getDB };
