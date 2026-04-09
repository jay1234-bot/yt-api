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

  const { uid, itemId } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const db = await getDB();
    const col = db.collection('gallery');

    // GET — list all images for user
    if (req.method === 'GET') {
      const items = await col.find({ uid }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      return res.json({ success: true, items });
    }

    // POST — upload image
    if (req.method === 'POST') {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => body += c);
        req.on('end', resolve);
        req.on('error', reject);
      });

      const { imageBase64, caption = '', mimeType = 'image/jpeg' } = JSON.parse(body);
      if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

      const buffer = Buffer.from(imageBase64, 'base64');
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
      const filename = `gallery/${uid}/${Date.now()}.${ext}`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false
      });

      const itemId = Date.now().toString();
      const doc = { uid, itemId, url: blob.url, caption, createdAt: new Date() };
      await col.insertOne(doc);

      return res.json({ success: true, item: { itemId, url: blob.url, caption } });
    }

    // DELETE — remove image
    if (req.method === 'DELETE') {
      if (!itemId) return res.status(400).json({ error: 'itemId required' });
      const item = await col.findOne({ uid, itemId });
      if (item?.url) {
        try { await del(item.url); } catch(e) { console.log('Blob delete failed:', e.message); }
      }
      await col.deleteOne({ uid, itemId });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Gallery error:', err);
    return res.status(500).json({ error: err.message });
  }
};
