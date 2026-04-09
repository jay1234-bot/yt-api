module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    name: 'CET Tracker API',
    endpoints: {
      search: '/api/search?q=song+name',
      stream: '/api/stream?id=VIDEO_ID',
      user: '/api/user?uid=USER_ID',
      gallery: '/api/gallery?uid=USER_ID',
      Developer: Krishan
    }
  });
};
