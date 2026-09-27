const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const YTDLP_PATH = path.join(os.tmpdir(), 'yt-dlp');
const DOWNLOAD_DIR = path.join(os.tmpdir(), 'yt-downloads');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const errorMsg = (stderr || error.message).trim();
        if (errorMsg.includes('WARNING')) {
          resolve(stdout.trim());
        } else {
          reject(new Error(errorMsg));
        }
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function ensureYtDlp() {
  if (fs.existsSync(YTDLP_PATH)) return;
  const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
  const res = await fetch(YTDLP_URL);
  if (!res.ok) throw new Error(`yt-dlp download failed (${res.status})`);
  fs.writeFileSync(YTDLP_PATH, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, quality = 'high', format = 'mp3' } = req.body;

  if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'A valid 11-character YouTube video ID is required' });
  }

  if (!['low', 'medium', 'high', 'best'].includes(quality)) {
    return res.status(400).json({ error: 'Quality must be: low, medium, high, or best' });
  }

  if (!['mp3', 'm4a', 'wav', 'opus'].includes(format)) {
    return res.status(400).json({ error: 'Format must be: mp3, m4a, wav, or opus' });
  }

  try {
    await ensureYtDlp();
    const url = `https://www.youtube.com/watch?v=${id}`;

    // Map quality to bitrate
    const bitrates = { low: '128', medium: '192', high: '320', best: '320' };
    const bitrate = bitrates[quality];

    // Generate output filename
    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOAD_DIR, `%(title)s-${timestamp}.%(ext)s`);

    // Determine format specifier
    let formatSpec;
    if (format === 'mp3') {
      formatSpec = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best';
    } else if (format === 'm4a') {
      formatSpec = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best';
    } else if (format === 'wav') {
      formatSpec = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best';
    } else if (format === 'opus') {
      formatSpec = 'bestaudio[ext=webm]/bestaudio/best';
    }

    // Download with proper audio extraction
    const args = [
      '-f', formatSpec,
      '-x',
      '--audio-format', format === 'mp3' ? 'mp3' : format,
      '--audio-quality', bitrate + 'K',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '-R', '5',
      '--socket-timeout', '30',
      '-o', outputTemplate,
      url
    ];

    console.log('Starting download:', { id, quality, format, bitrate });
    await runYtDlp(args);

    // Find the downloaded file
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const downloadedFile = files.find(f => f.includes(String(timestamp)));

    if (!downloadedFile) {
      return res.status(500).json({ error: 'Download completed but file not found' });
    }

    const filePath = path.join(DOWNLOAD_DIR, downloadedFile);
    const fileSize = fs.statSync(filePath).size;

    // Send file for download
    res.setHeader('Content-Type', `audio/${format === 'mp3' ? 'mpeg' : format}`);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadedFile}"`);
    res.setHeader('Content-Length', fileSize);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after download completes
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
          console.log('Cleaned up:', downloadedFile);
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, 1000);
    });

    fileStream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'Error streaming file' });
    });
  } catch (error) {
    console.error('Download error:', error.message);

    if (error.message.includes('bot') || error.message.includes('sign in')) {
      return res.status(503).json({
        error: 'YouTube is requiring authentication. Please try again in a few moments.',
        hint: 'This usually resolves automatically after a short delay'
      });
    }

    return res.status(502).json({ error: 'Unable to download audio', details: error.message });
  }
};
