const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cache = require('./cache');

const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
let downloadPromise;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

async function ensureYtDlp() {
  if (fs.existsSync(YTDLP_PATH)) return;
  if (!downloadPromise) {
    downloadPromise = fetch(YTDLP_URL).then(async (response) => {
      if (!response.ok) throw new Error(`yt-dlp download failed (${response.status})`);
      fs.writeFileSync(YTDLP_PATH, Buffer.from(await response.arrayBuffer()), { mode: 0o755 });
    }).finally(() => { downloadPromise = undefined; });
  }
  await downloadPromise;
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { timeout: 25000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || error.message).trim()));
      resolve(stdout.trim());
    });
  });
}

module.exports = async (req, res) => {
  setCors(res);
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
    const [streamUrl, info] = await Promise.all([
      runYtDlp(['-f', 'bestaudio[ext=m4a]/bestaudio/best', '--get-url', '--no-playlist', '--no-warnings', url]),
      runYtDlp(['--print', '%(title)s|||%(thumbnail)s|||%(uploader)s|||%(duration)s', '--no-playlist', '--no-warnings', url])
    ]);
    const [title, thumbnail, artist, duration] = info.split('|||');
    const result = {
      streamUrl,
      title: title || id,
      artist: artist || 'YouTube',
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: Number.parseInt(duration, 10) || 0
    };
    cache.set(`stream:${id}`, result, 60 * 1000);
    return res.json({ success: true, cached: false, ...result });
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(502).json({ error: 'Unable to resolve this YouTube stream' });
  }
};
