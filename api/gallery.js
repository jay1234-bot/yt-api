// Gallery — stores images as base64 directly in MongoDB
// No Vercel Blob needed

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

    if (req.method === 'GET') {
      // Return items without base64 data for listing (just url/caption/itemId)
      const items = await col.find(
        { uid },
        { projection: { _id: 0, uid: 0, imageData: 0 } }
      ).sort({ createdAt: -1 }).toArray();
      return res.json({ success: true, items });
    }

    if (req.method === 'POST') {
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', c => body += c);
        req.on('end', resolve);
        req.on('error', reject);
      });

      const { imageBase64, caption = '', mimeType = 'image/jpeg' } = JSON.parse(body);
      if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

      // Store as data URL directly in MongoDB
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;
      const newItemId = Date.now().toString();

      await col.insertOne({
        uid,
        itemId: newItemId,
        url: dataUrl,   // base64 data URL
        caption,
        createdAt: new Date()
      });

      return res.json({
        success: true,
        item: { itemId: newItemId, url: dataUrl, caption }
      });
    }

    if (req.method === 'DELETE') {
      if (!itemId) return res.status(400).json({ error: 'itemId required' });
      await col.deleteOne({ uid, itemId });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Gallery error:', err);
    return res.status(500).json({ error: err.message });
  }
};
