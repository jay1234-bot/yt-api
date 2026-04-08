// /api/search?q=query&limit=10
const ytsr = require('ytsr');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" required' });

  try {
    const filters = await ytsr.getFilters(q);
    const filter = filters.get('Type')?.get('Video');
    const results = await ytsr(filter?.url || q, {
      limit: parseInt(limit),
      safeSearch: false
    });

    const songs = results.items
      .filter(item => item.type === 'video' && item.id)
      .map(item => ({
        id: item.id,
        title: item.title,
        artist: item.author?.name || 'Unknown',
        duration: item.duration || '0:00',
        thumbnail: item.bestThumbnail?.url || item.thumbnails?.[0]?.url || '',
        url: item.url
      }));

    return res.json({ success: true, results: songs });
  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
