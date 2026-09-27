# YouTube Music API - Authentication Setup Guide

## 🔐 How to Enable YouTube Authentication

YouTube is blocking automated requests because it requires verification. To fix this, you need to provide **YouTube authentication cookies**.

### Step 1: Export Your YouTube Cookies

#### Option A: Using Browser Extension (Easiest)

1. **Chrome/Edge Users:**
   - Install [Get cookies.txt](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndaipenyoilcaleggf33447acop)
   - Go to https://www.youtube.com
   - Click the extension icon → "Export" or "Download"
   - Save as `cookies.txt`

2. **Firefox Users:**
   - Install [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
   - Go to https://www.youtube.com
   - Click the extension icon → Export
   - Save as `cookies.txt`

#### Option B: Manual Export (DevTools)

1. Go to https://www.youtube.com and **log in to your account**
2. Open DevTools (`F12` or right-click → Inspect)
3. Go to **Application** tab → **Cookies** → `youtube.com`
4. Right-click → **Export as** → Save as `cookies.txt`

---

### Step 2: Place Cookies in Your Environment

#### Local Development:

```bash
# Copy cookies to home directory
cp ~/Downloads/cookies.txt ~/.yt-cookies.txt

# Or set environment variable
export YT_COOKIES_PATH=/full/path/to/cookies.txt
```

#### Vercel Deployment:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Create a new variable `YT_COOKIES_PATH` with value `/tmp/yt-cookies.txt`
4. In your build/start script, copy cookies:
   ```bash
   echo "$YT_COOKIES_CONTENT" > /tmp/yt-cookies.txt
   ```
5. Create another variable `YT_COOKIES_CONTENT` with the **contents** of your `cookies.txt` file

#### Docker:

```dockerfile
# In your Dockerfile
ENV YT_COOKIES_PATH=/app/.yt-cookies.txt
COPY cookies.txt /app/.yt-cookies.txt
```

---

### Step 3: Test the Stream Endpoint

```bash
# Local development
export YT_COOKIES_PATH=~/.yt-cookies.txt
npm start

# Test endpoint
curl "http://localhost:3000/api/stream?id=dQw4w9WgXcQ"
```

Expected response (when authenticated):
```json
{
  "success": true,
  "cached": false,
  "streamUrl": "https://rr1---sn-...",
  "title": "Rick Astley - Never Gonna Give You Up",
  "artist": "Rick Astley Official",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "duration": 212
}
```

---

### Step 4: Download Endpoint with Authentication

The `/api/download` endpoint also supports authentication:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dQw4w9WgXcQ",
    "quality": "high",
    "format": "mp3"
  }' \
  --output song.mp3
```

---

### 🔄 Refreshing Cookies

YouTube cookies expire after ~30 days. When you get an error:

```json
{
  "error": "YouTube requires authentication",
  "solution": "Please provide YouTube cookies.txt file"
}
```

Simply:
1. Export fresh cookies from your browser (same steps as Step 1)
2. Update the file at `~/.yt-cookies.txt`
3. Restart your server

---

### ⚠️ Important Security Notes

- **Never commit `cookies.txt` to Git** - It grants full access to your account
- **Never share cookies.txt** - Treat it like your password
- **Keep cookies.txt local and private** - Only on your trusted server/machine
- **Use environment variables** for production deployments
- **Rotate cookies monthly** by exporting fresh ones from your browser

---

### Troubleshooting

**Error: "YouTube said: Please sign in to confirm you're not a bot"**
- Your cookies are expired or invalid
- Export fresh cookies from your browser (Step 1)
- Ensure you're logged into YouTube when exporting

**Error: "No such file or directory ~/.yt-cookies.txt"**
- Make sure cookies are in the right location
- Check `YT_COOKIES_PATH` environment variable is set correctly
- Run: `echo $YT_COOKIES_PATH` to verify

**Error: Permission denied**
- Ensure `cookies.txt` has read permissions: `chmod 600 ~/.yt-cookies.txt`
- On Linux/Mac: `sudo chown $USER ~/.yt-cookies.txt`

---

### API Endpoints Status

After setting up cookies:

- ✅ `GET /api/search?q=song` - Search (no auth needed)
- ✅ `GET /api/stream?id=VIDEO_ID` - Get stream URL (auth recommended)
- ✅ `POST /api/download` - Download audio (auth required)

---

**Questions?** Check the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#cookies) for advanced usage.
