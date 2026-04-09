module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      status: 'ok',
      name: 'CET Tracker API',
      env: {
        mongodb: !!process.env.MONGODB_URI,
        blob: !!process.env.BLOB_READ_WRITE_TOKEN
      },
      endpoints: {
        search:  '/api/search?q=song+name',
        stream:  '/api/stream?id=VIDEO_ID',
        user:    '/api/user?uid=USER_ID',
        gallery: '/api/gallery?uid=USER_ID'
      }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
