// Uses Invidious public instances to get YouTube audio stream URL
// No bot detection, no auth needed, completely free

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacydev.net',
  'https://yt.cdaut.de',
  'https://invidious.io.lol'
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  // Try each instance until one works
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) continue;
      const data = await response.json();

      // Get best audio format
      const audioFormats = (data.adaptiveFormats || [])
        .filter(f => f.type?.startsWith('audio/') && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (!audioFormats.length) continue;

      const best = audioFormats[0];
      const thumbnail = data.videoThumbnails?.find(t => t.quality === 'high')?.url
        || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      return res.json({
        success: true,
        streamUrl: best.url,
        title: data.title || id,
        artist: data.author || 'YouTube',
        duration: data.lengthSeconds || 0,
        thumbnail
      });

    } catch (err) {
      console.log(`Instance ${instance} failed:`, err.message);
      continue;
    }
  }

  return res.status(500).json({
    error: 'All instances failed',
    details: 'Could not fetch stream from any Invidious instance'
  });
};
