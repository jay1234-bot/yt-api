const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// yt-dlp binary path (downloaded at runtime)
const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

async function ensureYtDlp() {
  if (fs.existsSync(YTDLP_PATH)) return;
  const res = await fetch(YTDLP_URL);
  if (!res.ok) throw new Error('Failed to download yt-dlp');
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(YTDLP_PATH, buf, { mode: 0o755 });
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { timeout: 25000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  try {
    await ensureYtDlp();

    const url = `https://www.youtube.com/watch?v=${id}`;

    // Get audio stream URL using yt-dlp
    const streamUrl = await runYtDlp([
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '--get-url',
      '--no-playlist',
      '--no-warnings',
      url
    ]);

    // Get title and thumbnail
    const info = await runYtDlp([
      '--print', '%(title)s|||%(thumbnail)s|||%(uploader)s|||%(duration)s',
      '--no-playlist',
      '--no-warnings',
      url
    ]);

    const [title, thumbnail, uploader, duration] = info.split('|||');

    return res.json({
      success: true,
      streamUrl,
      title: title || id,
      artist: uploader || 'YouTube',
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: parseInt(duration) || 0
    });

  } catch (err) {
    console.error('Stream error:', err.message);
    return res.status(500).json({ error: 'Stream failed', details: err.message });
  }
};
