// GET  /api/gallery?uid=xxx          — list images
// POST /api/gallery?uid=xxx          — upload image (multipart or base64 JSON)
// DELETE /api/gallery?uid=xxx&id=xxx — delete image

const { put, del } = require('@vercel/blob');
const { getDB } = require('./db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { uid, id } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const db = await getDB();
    const col = db.collection('gallery');

    if (req.method === 'GET') {
      const items = await col.find({ uid }).sort({ createdAt: -1 }).toArray();
      return res.json({ success: true, items });
    }

    if (req.method === 'POST') {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => body += c);
        req.on('end', resolve);
        req.on('error', reject);
      });
      const { imageBase64, caption, mimeType = 'image/jpeg' } = JSON.parse(body);
      if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

      // Upload to Vercel Blob
      const buffer = Buffer.from(imageBase64, 'base64');
      const filename = `gallery/${uid}/${Date.now()}.jpg`;
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      // Save metadata to MongoDB
      const doc = {
        uid,
        url: blob.url,
        caption: caption || '',
        createdAt: new Date(),
        _id: Date.now().toString()
      };
      await col.insertOne(doc);
      return res.json({ success: true, item: doc });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const item = await col.findOne({ uid, _id: id });
      if (item?.url) {
        try { await del(item.url, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch(e) {}
      }
      await col.deleteOne({ uid, _id: id });
      return res.json({ success: true });
    }
  } catch (err) {
    console.error('Gallery error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
