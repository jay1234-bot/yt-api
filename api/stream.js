module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  try {
    // Use cobalt.tools API - free, no bot detection
    const response = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${id}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '128'
      })
    });

    if (!response.ok) throw new Error('Cobalt API error: ' + response.status);
    const data = await response.json();

    // cobalt returns { status: 'stream'|'redirect'|'tunnel', url: '...' }
    if (data.status === 'error') throw new Error(data.error?.code || 'Cobalt error');

    const streamUrl = data.url;
    if (!streamUrl) throw new Error('No stream URL from cobalt');

    return res.json({
      success: true,
      streamUrl,
      title: data.filename || id,
      artist: 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    });

  } catch (err) {
    console.error('Stream error:', err.message);
    return res.status(500).json({ error: 'Stream failed', details: err.message });
  }
};
