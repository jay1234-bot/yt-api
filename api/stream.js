const cache = require('./cache');
const { ensureYtDlp, getCookieArgs, runYtDlp } = require('./ytdlp');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'A valid 11-character YouTube video ID is required' });
  }

  const cached = cache.get(`stream:${id}`);
  if (cached) return res.json({ success: true, cached: true, ...cached });

  try {
    await ensureYtDlp();
    const url = `https://www.youtube.com/watch?v=${id}`;
    const auth = await getCookieArgs();
    const common = ['--no-playlist', '--no-warnings', '--retries', '2', '--socket-timeout', '30', ...auth, url];
    const [streamUrl, info] = await Promise.all([
      runYtDlp(['-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best', '--get-url', ...common]),
      runYtDlp(['--print', '%(title)s|||%(thumbnail)s|||%(uploader)s|||%(duration)s', ...common])
    ]);
    const [title, thumbnail, artist, duration] = info.split('|||');
    const result = {
      streamUrl,
      title: title || id,
      artist: artist || 'YouTube',
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: Number.parseInt(duration, 10) || 0
    };
    cache.set(`stream:${id}`, result, 45 * 1000);
    return res.json({ success: true, cached: false, ...result });
  } catch (error) {
    console.error('Stream error:', error.message);
    const authRequired = /sign in|bot|confirm you're not a robot/i.test(error.message);
    return res.status(authRequired ? 503 : 502).json({
      error: authRequired ? 'YouTube requires verification' : 'Unable to resolve stream',
      hint: authRequired ? 'Configure YT_COOKIES_PATH or YT_COOKIES_B64 on the server using fresh cookies from your own account.' : undefined
    });
  }
};
