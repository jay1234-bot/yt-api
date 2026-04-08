module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  try {
    // cobalt.tools v7 API format
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${id}`,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        isAudioOnly: true,
        isNoTTWatermark: true,
        isTTFullAudio: false,
        isAudioMuted: false,
        dubLang: false,
        disableMetadata: false,
        twitterGif: false,
        tiktokH265: false
      })
    });

    const data = await response.json();
    console.log('Cobalt response:', JSON.stringify(data));

    // cobalt returns status: 'stream', 'redirect', 'picker', 'error'
    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt error');
    }

    const streamUrl = data.url;
    if (!streamUrl) throw new Error('No URL in cobalt response: ' + JSON.stringify(data));

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
