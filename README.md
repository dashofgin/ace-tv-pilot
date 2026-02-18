# Dash TV

Self-hosted web app for watching Ace Stream TV channels in the browser. No plugins, no desktop app — just open the page and watch.

Built for low-power devices like Intel N100 mini PCs.

---

**[Wersja polska](#dash-tv--wersja-polska) poniżej.**

---

## What it does

- Streams Ace Stream (P2P) TV channels via HLS directly in Chrome, Firefox, and Safari
- Auto-detects interlaced video and MP2 audio — transcodes only when needed (VAAPI hardware acceleration)
- EPG (Electronic Program Guide) with current/upcoming programs scraped from [programtv.onet.pl](https://programtv.onet.pl) (49 channels)
- **Telegazeta** — full TV guide page showing what's on now and next across all channels
- Channel status checker with P2P peer count monitoring
- Multi-user support with password-protected access (bcrypt hashed)

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
- **EPG scraping** — HTML scraper for programtv.onet.pl, runs every 12 hours, covers 49 Polish TV channels

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
│   │   │   ├── epg.js       # EPG endpoints
│   │   │   └── auth.js      # Authentication (multi-user, bcrypt)
│   │   ├── services/
│   │   │   ├── acestream.js # Ace Stream session management
│   │   │   ├── checker.js   # Channel availability checker
│   │   │   └── epg.js       # EPG scraper (programtv.onet.pl)
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
│           ├── WatchPage.jsx     # Main viewing page
│           ├── GuidePage.jsx     # Telegazeta - full TV guide
│           └── ManagePage.jsx    # Channel management
├── nginx/nginx.conf
├── data/channels.json       # Channel definitions with EPG mapping
└── docker-compose.yml
```

## Tech stack

- **Frontend**: React, Tailwind CSS, hls.js
- **Backend**: Node.js, Express
- **Streaming**: Ace Stream Engine, FFmpeg (VAAPI)
- **Infrastructure**: Docker Compose, nginx

---

## Dash TV — Wersja polska

Aplikacja webowa do ogladania kanalow Ace Stream TV w przegladarce. Bez pluginow, bez aplikacji desktopowej — wystarczy otworzyc strone i ogladac.

Zaprojektowana pod urzadzenia o niskiej mocy obliczeniowej (np. Intel N100).

### Co potrafi

- Streamuje kanaly Ace Stream (P2P) przez HLS bezposrednio w Chrome, Firefox i Safari
- Automatycznie wykrywa wideo z przeplotem i audio MP2 — transkoduje tylko gdy trzeba (akceleracja sprzetowa VAAPI)
- EPG (program telewizyjny) z aktualnymi i nadchodzacymi programami z [programtv.onet.pl](https://programtv.onet.pl) (49 kanalow)
- **Telegazeta** — pelny przewodnik TV pokazujacy co leci teraz i co nastepnie na wszystkich kanalach
- Sprawdzanie statusu kanalow z liczba peerow P2P
- Obsluga wielu uzytkownikow z dostepm chronionym haslem (bcrypt)

### Jak to dziala

1. **Ace Stream Engine** dziala w Dockerze, obsluguje P2P i generuje segmenty HLS
2. **Backend Node.js** uruchamia streamy przez API `format=json`, proxy manifestow z przepisywaniem URL
3. **Inteligentne proxy transkodujace** — przy pierwszym segmencie kazdego kanalu `ffprobe` sprawdza czy wideo jest z przeplotem lub audio to MP2. Jesli tak, segmenty przechodza przez FFmpeg (VAAPI). Progresywne H.264 + AAC przechodzi bez zmian
4. **nginx** serwuje frontend SPA i kieruje `/ace/` do backendu, `/api/` do REST API
5. **hls.js** w przegladarce odtwarza przepisany manifest. Buforuje 2 segmenty przed rozpoczeciem odtwarzania

### Szybki start

```bash
git clone https://github.com/dashofgin/ace-tv-pilot.git
cd ace-tv-pilot
docker compose up -d --build
cd frontend && npm install && npm run build && cd ..
```

Otworz `http://localhost:3000` w przegladarce.

## License

MIT
