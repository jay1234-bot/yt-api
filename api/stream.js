// /api/stream?id=VIDEO_ID  — streams audio directly
const ytdl = require('ytdl-core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    if (!ytdl.validateID(id)) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    if (!format) return res.status(404).json({ error: 'No audio format found' });

    const title = info.videoDetails.title;
    const duration = info.videoDetails.lengthSeconds;
    const thumbnail = info.videoDetails.thumbnails?.slice(-1)[0]?.url || '';
    const author = info.videoDetails.author?.name || 'Unknown';

    // Return stream URL directly (redirect) so browser can play it
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      streamUrl: format.url,
      title,
      artist: author,
      duration: parseInt(duration),
      thumbnail,
      mimeType: format.mimeType
    });
  } catch (err) {
    console.error('Stream error:', err.message);
    return res.status(500).json({ error: 'Stream failed', details: err.message });
  }
};
