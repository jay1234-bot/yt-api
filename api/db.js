// Shared MongoDB connection
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client = null;
let db = null;

async function getDB() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }
  db = client.db('cet_tracker');
  return db;
}

module.exports = { getDB };
