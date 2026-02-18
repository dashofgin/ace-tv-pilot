import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

// Detect Safari/iOS - prefer native HLS
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
  /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function VideoPlayer({ playbackUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [buffering, setBuffering] = useState(true);
  const [status, setStatus] = useState('Laczenie...');

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;

    const video = videoRef.current;
    cleanup();
    setBuffering(true);
    setStatus('Laczenie...');

    // Safari/iOS: native HLS
    if (isSafari && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.muted = true;
      video.onloadedmetadata = () => {
        setBuffering(false);
        video.play().catch(() => {});
      };
      video.onwaiting = () => setBuffering(true);
      video.onplaying = () => setBuffering(false);
      return () => { video.src = ''; };
    }

    // Chrome/Firefox: hls.js - minimal config like AceMux
    if (!Hls.isSupported()) return;

    const hls = new Hls({
      liveDurationInfinity: true,
      enableWorker: true,
      lowLatencyMode: false,
      // Generous timeouts for P2P
      fragLoadingTimeOut: 30000,
      fragLoadingMaxRetry: 5,
      manifestLoadingTimeOut: 15000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 15000,
      levelLoadingMaxRetry: 3,
    });

    hls.loadSource(playbackUrl);
    hls.attachMedia(video);

    // Wait for 2 segments to buffer before playing to avoid initial stall
    let fragsBuffered = 0;
    let playStarted = false;

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('[HLS] Manifest parsed, pre-buffering...');
      setStatus('Buforowanie...');
      video.muted = true;
    });

    // Debug logging
    hls.on(Hls.Events.FRAG_LOADED, (_e, data) => {
      console.log('[HLS] FRAG_LOADED:', data.frag.sn);
    });
    hls.on(Hls.Events.FRAG_BUFFERED, (_e, data) => {
      fragsBuffered++;
      console.log('[HLS] FRAG_BUFFERED:', data.frag.sn,
        'readyState:', video.readyState,
        'currentTime:', video.currentTime.toFixed(2),
        'buffered:', video.buffered.length > 0 ? `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}` : 'none',
        'paused:', video.paused);

      // Start playback after 2 segments are buffered
      if (!playStarted && fragsBuffered >= 2) {
        playStarted = true;
        video.play().then(() => {
          console.log('[HLS] play() SUCCESS after', fragsBuffered, 'frags');
          setBuffering(false);
        }).catch((err) => {
          console.error('[HLS] play() FAILED:', err.message);
        });
      } else if (playStarted) {
        setBuffering(false);
      }
    });
    hls.on(Hls.Events.BUFFER_CODECS, (_e, data) => {
      // Log actual codec info
      const info = {};
      if (data.audio) info.audio = data.audio.codec || data.audio.id;
      if (data.video) info.video = data.video.codec || data.video.id;
      console.log('[HLS] BUFFER_CODECS:', JSON.stringify(info));
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      console.warn('[HLS] Error:', data.fatal ? 'FATAL' : 'warn', data.type, data.details, data.reason || '', data.error || '');
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.log('[HLS] Attempting media error recovery');
          hls.recoverMediaError();
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setStatus('Blad sieci, ponawiam...');
          hls.startLoad();
        }
      }
    });

    hlsRef.current = hls;

    video.onwaiting = () => { setBuffering(true); setStatus('Buforowanie...'); };
    video.onplaying = () => setBuffering(false);
    video.oncanplay = () => setBuffering(false);

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl, cleanup]);

  if (!playbackUrl) return null;

  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full aspect-video" controls playsInline />
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
            <div className="text-white text-sm">{status}</div>
          </div>
        </div>
      )}
    </div>
  );
}
