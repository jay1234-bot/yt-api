module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  try {
    const apiUrl = `https://apex.spacebilla01.workers.dev/yt?id=${id}&format=mp3`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('BillaSpace error: ' + response.status);
    const data = await response.json();
    if (!data.download_url) throw new Error(data.error || 'No download_url in response');

    return res.json({
      success: true,
      streamUrl: data.download_url,
      title: data.title || id,
      artist: 'YouTube',
      thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: data.duration || ''
    });

  } catch (err) {
    console.error('Stream error:', err.message);
    return res.status(500).json({ error: 'Stream failed', details: err.message });
  }
};
