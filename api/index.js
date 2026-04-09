module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    name: 'CET Tracker API',
    env: { mongodb: !!process.env.MONGODB_URI },
    endpoints: {
      search:  '/api/search?q=song+name',
      stream:  '/api/stream?id=VIDEO_ID',
      user:    '/api/user?uid=USER_ID',
      gallery: '/api/gallery?uid=USER_ID'
    }
  });
};
