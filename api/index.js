// Health check / root
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    name: 'YT Music API',
    endpoints: {
      search: '/api/search?q=song+name&limit=10',
      stream: '/api/stream?id=VIDEO_ID'
    }
  });
};
