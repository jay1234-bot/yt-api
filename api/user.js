// GET  /api/user?uid=xxx        — load user data
// POST /api/user?uid=xxx        — save user data (body = JSON)

const { getDB } = require('./db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const db = await getDB();
    const col = db.collection('users');

    if (req.method === 'GET') {
      const doc = await col.findOne({ uid });
      return res.json({ success: true, data: doc?.data || null });
    }

    if (req.method === 'POST') {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => body += c);
        req.on('end', resolve);
        req.on('error', reject);
      });
      const data = JSON.parse(body);
      await col.updateOne(
        { uid },
        { $set: { uid, data, updatedAt: new Date() } },
        { upsert: true }
      );
      return res.json({ success: true });
    }
  } catch (err) {
    console.error('User API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
