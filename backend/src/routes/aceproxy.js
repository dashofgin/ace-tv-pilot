const express = require('express');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ACESTREAM_URL = process.env.ACESTREAM_URL || 'http://acestream:6878';

const router = express.Router();

// Cache: infohash -> { needs: boolean, ts: number }
const transcodeCache = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Check VAAPI availability once at startup
let useVaapi = false;
try {
  execFileSync('ffmpeg', [
    '-init_hw_device', 'vaapi=va:/dev/dri/renderD128',
    '-f', 'lavfi', '-i', 'nullsrc=s=64x64:d=0.1',
    '-vf', 'format=nv12,hwupload',
    '-c:v', 'h264_vaapi', '-frames:v', '1',
    '-f', 'null', '-'
  ], { timeout: 10000, stdio: 'pipe' });
  useVaapi = true;
  console.log('[ace proxy] VAAPI hardware encoding available');
} catch {
  console.log('[ace proxy] VAAPI not available, using software encoding');
}

function getTranscodeArgs() {
  if (useVaapi) {
    return [
      '-copyts',
      '-hwaccel', 'vaapi', '-hwaccel_device', '/dev/dri/renderD128', '-hwaccel_output_format', 'vaapi',
      '-i', 'pipe:0',
      '-vf', 'deinterlace_vaapi,scale_vaapi=w=1280:h=720',
      '-c:v', 'h264_vaapi', '-qp', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-mpegts_copyts', '1',
      '-f', 'mpegts', '-y', 'pipe:1'
    ];
  }
  return [
    '-copyts', '-i', 'pipe:0',
    '-vf', 'yadif,scale=1280:720',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-mpegts_copyts', '1',
    '-f', 'mpegts', '-y', 'pipe:1'
  ];
}

function probeNeedsTranscode(filePath) {
  try {
    const result = execFileSync('ffprobe', [
      '-v', 'error', '-show_streams', '-of', 'json', filePath
    ], { timeout: 10000 }).toString();
    const { streams } = JSON.parse(result);
    for (const s of streams) {
      if (s.codec_type === 'audio' && s.codec_name === 'mp2') return true;
      if (s.codec_type === 'video' && s.field_order && s.field_order !== 'progressive' && s.field_order !== 'unknown') return true;
    }
    return false;
  } catch {
    return true; // default to transcode on probe failure
  }
}

function sendRaw(data, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Content-Length', data.length);
  res.end(data);
}

function sendTranscoded(data, res, req) {
  const ffmpeg = spawn('ffmpeg', getTranscodeArgs(), { stdio: ['pipe', 'pipe', 'pipe'] });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'video/mp2t');

  ffmpeg.stdout.pipe(res);
  ffmpeg.stdin.end(data);

  ffmpeg.stderr.on('data', () => {});
  ffmpeg.on('error', (err) => {
    console.error('[ace proxy] ffmpeg error:', err.message);
    if (!res.headersSent) res.status(502).send('Transcode failed');
  });
  ffmpeg.on('close', (code) => {
    if (code !== 0 && !res.headersSent) res.status(502).send('Transcode failed');
  });

  req.on('close', () => ffmpeg.kill('SIGTERM'));
}

function pipeTranscoded(proxyRes, res, req) {
  const ffmpeg = spawn('ffmpeg', getTranscodeArgs(), { stdio: ['pipe', 'pipe', 'pipe'] });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'video/mp2t');

  proxyRes.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', () => {});
  ffmpeg.on('error', () => {
    if (!res.headersSent) res.status(502).send('Transcode failed');
  });
  ffmpeg.on('close', (code) => {
    if (code !== 0 && !res.headersSent) res.status(502).send('Transcode failed');
  });

  req.on('close', () => {
    ffmpeg.kill('SIGTERM');
  });
}

// Catch-all proxy for /ace/*
router.all('/*', async (req, res) => {
  const restPath = req.params[0] || '';
  const queryString = req._parsedUrl.search || '';
  const target = `${ACESTREAM_URL}/ace/${restPath}${queryString}`;
  const isSegment = restPath.endsWith('.ts');

  if (isSegment) {
    const parts = restPath.split('/');
    const infohash = parts.length >= 2 ? parts[1] : null;

    // If we haven't probed this infohash yet (or cache expired), buffer first segment and probe
    const cached = transcodeCache.get(infohash);
    const cacheValid = cached && (Date.now() - cached.ts < CACHE_TTL);
    if (infohash && !cacheValid) {
      const proxyReq = http.get(target, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
          res.writeHead(proxyRes.statusCode);
          proxyRes.pipe(res);
          return;
        }

        // Buffer entire segment for probing
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const data = Buffer.concat(chunks);
          const tmpFile = path.join(os.tmpdir(), `ace-probe-${infohash}.ts`);
          try {
            fs.writeFileSync(tmpFile, data);
            const needs = probeNeedsTranscode(tmpFile);
            transcodeCache.set(infohash, { needs, ts: Date.now() });
            console.log(`[ace proxy] Probe ${infohash.slice(0, 8)}: ${needs ? 'TRANSCODE (interlaced/MP2)' : 'PASSTHROUGH (progressive/AAC)'}`);
            fs.unlinkSync(tmpFile);

            if (needs) {
              sendTranscoded(data, res, req);
            } else {
              sendRaw(data, res);
            }
          } catch (err) {
            console.error('[ace proxy] probe error:', err.message);
            try { fs.unlinkSync(tmpFile); } catch {}
            sendRaw(data, res); // fallback to raw
          }
        });
      });
      proxyReq.on('error', (err) => {
        console.error('[ace proxy] segment error:', err.message);
        if (!res.headersSent) res.status(502).send('Segment fetch failed');
      });
      req.on('close', () => proxyReq.destroy());
      return;
    }

    // Subsequent segments: use cached decision
    const shouldTranscode = cached?.needs;

    const proxyReq = http.get(target, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
        return;
      }

      if (shouldTranscode) {
        pipeTranscoded(proxyRes, res, req);
      } else {
        // Passthrough
        res.setHeader('Access-Control-Allow-Origin', '*');
        const ct = proxyRes.headers['content-type'];
        if (ct) res.setHeader('Content-Type', ct);
        const cl = proxyRes.headers['content-length'];
        if (cl) res.setHeader('Content-Length', cl);
        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
      }
    });
    proxyReq.on('error', (err) => {
      console.error('[ace proxy] segment error:', err.message);
      if (!res.headersSent) res.status(502).send('Segment fetch failed');
    });
    req.on('close', () => proxyReq.destroy());
    return;
  }

  // For m3u8 and JSON: fetch + URL rewriting
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'Accept': req.headers.accept || '*/*',
        'User-Agent': req.headers['user-agent'] || 'AceTVPilot/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream error');
    }

    const contentType = upstream.headers.get('content-type') || '';

    if (contentType.includes('application/json') || queryString.includes('format=json')) {
      let body = await upstream.text();
      body = body.replace(/http:\/\/[^\/]+:6878\/ace\//g, '/ace/');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(body);
    }

    if (contentType.includes('mpegurl') || restPath.endsWith('.m3u8')) {
      let body = await upstream.text();
      body = body.replace(/http:\/\/[^\/]+:6878\/ace\//g, '/ace/');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(body);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('[ace proxy]', err.message);
    if (!res.headersSent) {
      res.status(502).send('AceStream not accessible');
    }
  }
});

module.exports = router;
