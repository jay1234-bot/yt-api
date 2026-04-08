const YoutubeSearchApi = require('youtube-search-api');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, limit = 12 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" required' });

  try {
    const data = await YoutubeSearchApi.GetListByKeyword(q, false, parseInt(limit), [{ type: 'video' }]);
    const items = data.items || [];

    const results = items
      .filter(item => item.id && item.type === 'video')
      .map(item => ({
        id: item.id,
        title: item.title,
        artist: item.channelTitle || 'Unknown',
        duration: item.length?.simpleText || '0:00',
        thumbnail: item.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));

    return res.json({ success: true, results });
  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
