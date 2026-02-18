# Dash TV

Self-hosted web app for watching Ace Stream TV channels in the browser. No plugins, no desktop app — just open the page and watch.

Built for low-power devices like Intel N100 mini PCs.

## What it does

- Streams Ace Stream (P2P) TV channels via HLS directly in Chrome, Firefox, and Safari
- Auto-detects interlaced video and MP2 audio — transcodes only when needed (VAAPI hardware acceleration)
- EPG (Electronic Program Guide) with current/upcoming programs from [epg.ovh](https://epg.ovh)
- Channel status checker with P2P peer count monitoring
- Password-protected access (bcrypt hashed)

## How it works

```
Browser (hls.js) ←→ nginx ←→ Node.js backend ←→ Ace Stream Engine
                                    ↕
                              FFmpeg (VAAPI)
```

1. **Ace Stream Engine** runs in Docker, handles P2P and produces HLS segments (`.ts` + `.m3u8`)
2. **Node.js backend** starts streams via `format=json` API, proxies manifests with URL rewriting, and serves as the segment proxy
3. **Smart transcoding proxy** — on first segment of each channel, `ffprobe` checks if video is interlaced or audio is MP2. If so, segments go through FFmpeg (with VAAPI hw accel if available). Progressive H.264 + AAC passes through untouched
4. **nginx** serves the frontend SPA and routes `/ace/` to the backend proxy, `/api/` to the REST API
5. **hls.js** in the browser plays the rewritten manifest. Pre-buffers 2 segments before starting playback to avoid initial stalls

### Key design decisions

- **No `transcode_audio=1`** — Ace Stream's built-in audio transcoding crashes sessions for MP2 channels. Instead, we transcode in our own proxy when needed
- **`-copyts` + `-mpegts_copyts 1`** — Critical FFmpeg flags. Without them, each independently transcoded segment resets timestamps to 0 and the browser buffer stays stuck at ~5 seconds
- **VAAPI over software encoding** — On Intel N100, hardware encoding uses near-zero CPU vs maxing out all cores with libx264
- **Probe caching** — Each channel's transcode decision is cached for 4 hours to avoid re-probing

## Setup

### Requirements

- Docker + Docker Compose
- Intel GPU with VAAPI support (optional, falls back to software encoding)

### Quick start

```bash
git clone https://github.com/dashofgin/ace-tv-pilot.git
cd ace-tv-pilot

# Build and run
docker compose up -d --build

# Build frontend
cd frontend && npm install && npm run build && cd ..
```

Open `http://localhost:3000` in your browser.

## Project structure

```
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   │   ├── aceproxy.js  # Smart HLS proxy with auto-transcoding
│   │   │   ├── stream.js    # Manifest proxy, stats, stop
│   │   │   ├── channels.js  # Channel CRUD
│   │   │   └── epg.js       # EPG endpoints
│   │   ├── services/
│   │   │   ├── acestream.js # Ace Stream session management
│   │   │   ├── checker.js   # Channel availability checker
│   │   │   └── epg.js       # EPG fetching and parsing
│   │   └── cron/            # Scheduled tasks (link check, EPG update)
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── VideoPlayer.jsx   # hls.js player with pre-buffering
│       │   ├── EpgTimeline.jsx   # Program guide under player
│       │   ├── ChannelCard.jsx   # Channel tile with EPG info
│       │   └── ...
│       └── pages/
├── nginx/nginx.conf
├── data/channels.json       # Channel definitions with EPG mapping
└── docker-compose.yml
```

## Tech stack

- **Frontend**: React, Tailwind CSS, hls.js
- **Backend**: Node.js, Express
- **Streaming**: Ace Stream Engine, FFmpeg (VAAPI)
- **Infrastructure**: Docker Compose, nginx

## License

MIT
