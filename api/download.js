const { createReadStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const { ensureYtDlp, getCookieArgs } = require('./ytdlp');
const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
const DIR = path.join(os.tmpdir(), 'yt-downloads');
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

function run(args) {
  return new Promise((resolve, reject) => execFile(YTDLP_PATH, args, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (e, out, err) => e ? reject(new Error((err || e.message).trim())) : resolve(out.trim())));
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const id = String(body.id || '').trim();
  const format = String(body.format || 'm4a').toLowerCase();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'A valid 11-character YouTube video ID is required' });
  if (!['m4a', 'mp3', 'opus'].includes(format)) return res.status(400).json({ error: 'format must be m4a, mp3, or opus' });
  try {
    await ensureYtDlp();
    const stamp = `${id}-${Date.now()}`;
    const template = path.join(DIR, `${stamp}.%(ext)s`);
    const auth = await getCookieArgs();
    const args = ['-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best', '--no-playlist', '--no-warnings', '--no-part', '-o', template, ...auth, `https://www.youtube.com/watch?v=${id}`];
    if (format !== 'm4a') args.push('-x', '--audio-format', format, '--audio-quality', '0');
    await run(args);
    const file = readdirSync(DIR).find((name) => name.startsWith(`${stamp}.`));
    if (!file) throw new Error('Downloaded file was not created; FFmpeg may be required for conversion');
    const filePath = path.join(DIR, file);
    const ext = path.extname(file).slice(1);
    res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`);
    res.setHeader('Content-Disposition', `attachment; filename="${id}.${ext}"`);
    res.setHeader('Content-Length', statSync(filePath).size);
    const stream = createReadStream(filePath);
    stream.on('close', () => { try { unlinkSync(filePath); } catch {} });
    stream.pipe(res);
  } catch (error) {
    const authRequired = /sign in|bot|confirm you're not a robot/i.test(error.message);
    return res.status(authRequired ? 503 : 502).json({ error: authRequired ? 'YouTube requires verification' : 'Unable to download audio', hint: authRequired ? 'Configure server-side YT_COOKIES_PATH or YT_COOKIES_B64.' : error.message });
  }
};
