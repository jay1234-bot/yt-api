module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  res.status(200).json({
    status: 'ok',
    name: 'YouTube Music API',
    version: '2.0.0',
    endpoints: {
      search: '/api/search?q=song+name&limit=12',
      stream: '/api/stream?id=VIDEO_ID',
      user: '/api/user?uid=USER_ID',
      gallery: '/api/gallery?uid=USER_ID'
    }
  });
};
