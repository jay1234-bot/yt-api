const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
const COOKIE_PATH = path.join(os.tmpdir(), 'yt-api-cookies.txt');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
let installPromise;
let cookiePromise;

async function ensureYtDlp() {
  if (fs.existsSync(YTDLP_PATH)) return;
  if (!installPromise) {
    installPromise = fetch(YTDLP_URL).then(async (response) => {
      if (!response.ok) throw new Error(`yt-dlp download failed (${response.status})`);
      const file = fs.openSync(YTDLP_PATH, 'w', 0o700);
      try { fs.writeFileSync(file, Buffer.from(await response.arrayBuffer())); }
      finally { fs.closeSync(file); }
      fs.chmodSync(YTDLP_PATH, 0o700);
    }).finally(() => { installPromise = undefined; });
  }
  await installPromise;
}

async function getCookieArgs() {
  if (process.env.YT_COOKIES_PATH) {
    if (!fs.existsSync(process.env.YT_COOKIES_PATH)) throw new Error('YT_COOKIES_PATH does not exist');
    return ['--cookies', process.env.YT_COOKIES_PATH];
  }
  if (!process.env.YT_COOKIES_B64) return [];
  if (!cookiePromise) {
    cookiePromise = fs.promises.writeFile(COOKIE_PATH, Buffer.from(process.env.YT_COOKIES_B64, 'base64'), { mode: 0o600 })
      .finally(() => { cookiePromise = undefined; });
  }
  await cookiePromise;
  return ['--cookies', COOKIE_PATH];
}

function runYtDlp(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || error.message).trim()));
      resolve(stdout.trim());
    });
  });
}

module.exports = { ensureYtDlp, getCookieArgs, runYtDlp };
