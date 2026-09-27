# YouTube Music API

Fast Vercel-compatible API for searching YouTube music and resolving temporary audio stream URLs.

## Endpoints

- `GET /api/search?q=artist%20song&limit=12`
- `GET /api/stream?id=VIDEO_ID`
- `GET /` for health and endpoint discovery

Search results are cached briefly in memory. Stream URLs are temporary and cached for only 60 seconds. Do not persist or redistribute them. Use YouTube playback and content in accordance with YouTube's terms and applicable copyright law.

## Local development

```bash
npm install
npx vercel dev
```

The stream endpoint downloads the current `yt-dlp` Linux binary into the serverless temporary directory on first use. Vercel's function timeout and platform limits still apply; for heavy traffic, use a dedicated worker instead of proxying audio through serverless functions.
