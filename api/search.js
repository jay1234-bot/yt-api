const YoutubeSearchApi = require('youtube-search-api');
const cache = require('./cache');

const MAX_QUERY_LENGTH = 200;
const MAX_LIMIT = 50;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = String(req.query.q || '').trim();
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : 12;

  if (!query) return res.status(400).json({ error: 'Query param "q" required' });
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Query must be ${MAX_QUERY_LENGTH} characters or fewer` });
  }

  const key = `search:${query.toLowerCase()}:${limit}`;
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, cached: true, results: cached });

  try {
    const data = await YoutubeSearchApi.GetListByKeyword(
      query,
      false,
      limit,
      [{ type: 'video' }]
    );

    const results = (data.items || [])
      .filter((item) => item.id && item.type === 'video')
      .map((item) => ({
        id: item.id,
        title: item.title || 'Untitled',
        artist: item.channelTitle || 'Unknown',
        duration: item.length?.simpleText || '0:00',
        thumbnail: item.thumbnail?.thumbnails?.at(-1)?.url ||
          `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));

    cache.set(key, results);
    return res.json({ success: true, cached: false, results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(502).json({ error: 'YouTube search is temporarily unavailable' });
  }
};
