import React, { useEffect, useRef, useState, useCallback } from "react";
import Player from "@vimeo/player";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";

const BUCKET_SECONDS = 5;
const FLUSH_INTERVAL_MS = 15000;
// Max gap between consecutive timeupdate positions to still interpolate buckets.
// Larger gaps (seeks that slip past seeking/seeked, or backgrounded playback) are
// treated as discontinuities: only the landing bucket is credited, never the skipped ones.
const CONTINUOUS_GAP_THRESHOLD = BUCKET_SECONDS;

// Tolerant parse: accept a bare numeric ID or a Vimeo embed snippet/URL.
function parseVimeoId(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/player\.vimeo\.com\/video\/(\d+)/) || s.match(/vimeo\.com\/(\d+)/);
  return m ? Number(m[1]) : null;
}

function formatTime(s) {
  if (!s || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Vimeo domain-level privacy: when a video is restricted to specific domains,
// playback on a non-whitelisted (or referrer-blocked) origin fails with a
// privacy/403-style error. Detect it so we can show an actionable message
// instead of a generic "couldn't load" error.
function isDomainPrivacyError(err) {
  if (!err) return false;
  const msg = String(err.message || err.name || err).toLowerCase();
  return (
    msg.includes("privacy") ||
    msg.includes("cannot be played") ||
    msg.includes("not allowed") ||
    msg.includes("forbidden") ||
    msg.includes("403")
  );
}

function domainPrivacyMessage() {
  let host = "";
  try { host = window.location.hostname; } catch { /* noop */ }
  return `Este dominio${host ? ` (${host})` : ""} no está autorizado para reproducir el video. En Vimeo, agrega el dominio en Privacidad → "Only allow specific domains" y verifica que el navegador envíe el referrer (política "origin").`;
}

export default function VimeoTrackedPlayer({
  programDayId,
  vimeoVideoId,
  vimeoUrl,
  enrollmentId,
  clientaId,
  weeklyCycleId,
  requiredPercent = 80,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const bucketsRef = useRef(new Set());
  const dirtyRef = useRef(new Set());
  const seekingRef = useRef(false);
  const playingRef = useRef(false);
  const durationRef = useRef(0);
  const lastPositionRef = useRef(0);
  const lastMarkedPositionRef = useRef(0);
  const completedRef = useRef(false);
  const flushingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validPercent, setValidPercent] = useState(0);
  const [resumePosition, setResumePosition] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  const updateLocalStats = useCallback(() => {
    const u = bucketsRef.current.size * BUCKET_SECONDS;
    setValidPercent(durationRef.current > 0 ? Math.min(100, (u / durationRef.current) * 100) : 0);
  }, []);

  // Load existing progress on mount
  useEffect(() => {
    if (!clientaId || !programDayId) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await base44.entities.VideoProgress.filter({
          clienta_id: clientaId,
          program_day_id: programDayId,
        });
        if (cancelled) return;
        const vp = existing && existing[0];
        if (!vp) return;
        try { bucketsRef.current = new Set(JSON.parse(vp.watched_buckets_json || "[]")); } catch { /* noop */ }
        if (vp.duration_seconds) { durationRef.current = vp.duration_seconds; }
        if (vp.completed) { setCompleted(true); completedRef.current = true; }
        if (vp.last_position_seconds > 5) { setResumePosition(vp.last_position_seconds); setShowResume(true); }
        updateLocalStats();
      } catch (err) {
        console.error("[VimeoTrackedPlayer] load progress error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [clientaId, programDayId, updateLocalStats]);

  // Backend completion validation — frontend never marks completed
  const validateCompletion = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("validateVideoCompletion", {
        programDayId, enrollmentId, clientaId, requiredPercent,
      });
      if (res?.data) {
        if (typeof res.data.valid_percent === "number") setValidPercent(res.data.valid_percent);
        if (res.data.completed) { setCompleted(true); completedRef.current = true; }
      }
    } catch (err) {
      console.error("[VimeoTrackedPlayer] validate error:", err);
    }
  }, [clientaId, programDayId, enrollmentId, requiredPercent]);

  // Persist helper — merges full local set with server
  const flush = useCallback(async (reason) => {
    if (!clientaId || !programDayId) return;
    if (flushingRef.current) return;
    const hasNew = dirtyRef.current.size > 0;
    if (!hasNew && reason === "interval") return;
    flushingRef.current = true;
    const snapshot = Array.from(dirtyRef.current);
    try {
      const res = await base44.functions.invoke("saveVideoProgressBatch", {
        programDayId, enrollmentId, clientaId, weeklyCycleId,
        watchedBuckets: Array.from(bucketsRef.current),
        lastPositionSeconds: lastPositionRef.current,
        durationSeconds: durationRef.current,
      });
      if (res?.data && typeof res.data.valid_percent === "number") setValidPercent(res.data.valid_percent);
      dirtyRef.current.clear();
      // Trigger server-side completion whenever the local recalculated percent
      // crosses the threshold — not only on the 'ended' event.
      if (!completedRef.current && durationRef.current > 0) {
        const localPercent = Math.min(100, (bucketsRef.current.size * BUCKET_SECONDS / durationRef.current) * 100);
        if (localPercent >= requiredPercent) validateCompletion();
      }
    } catch (err) {
      console.error("[VimeoTrackedPlayer] flush error:", err);
      snapshot.forEach((b) => dirtyRef.current.add(b));
    } finally {
      flushingRef.current = false;
    }
  }, [clientaId, programDayId, enrollmentId, weeklyCycleId, validateCompletion, requiredPercent]);

  // Initialize Vimeo player + wire all events
  useEffect(() => {
    const numericId = parseVimeoId(vimeoVideoId);
    const hasUrl = !!vimeoUrl;
    if (!containerRef.current || (!hasUrl && !numericId)) {
      setNotConfigured(true);
      setLoading(false);
      return;
    }
    setNotConfigured(false);
    let destroyed = false;
    setError(null);
    setLoading(true);

    const playerOpts = hasUrl ? { url: vimeoUrl, responsive: true } : { id: numericId, responsive: true };
    const player = new Player(containerRef.current, playerOpts);
    playerRef.current = player;

    player.ready().then(async () => {
      if (destroyed) return;
      try {
        const d = await player.getDuration();
        if (d > 0) { durationRef.current = d; updateLocalStats(); }
      } catch (e) { console.error("[VimeoTrackedPlayer] getDuration error:", e); }
    }).catch((err) => {
      if (destroyed) return;
      console.error("[VimeoTrackedPlayer] ready error:", err);
      setError(isDomainPrivacyError(err) ? domainPrivacyMessage() : "No se pudo cargar el video. Verifica tu conexión e intenta de nuevo.");
      setLoading(false);
    });

    player.on("loaded", () => { if (!destroyed) setLoading(false); });
    player.on("play", async () => {
      playingRef.current = true;
      // Sync the interpolation anchor to the actual start position so we don't
      // credit buckets between the previous anchor and this play point.
      try {
        const t = await player.getCurrentTime();
        lastMarkedPositionRef.current = t;
        lastPositionRef.current = t;
      } catch (e) { /* noop */ }
    });
    player.on("playing", () => { playingRef.current = true; seekingRef.current = false; });
    player.on("pause", () => { playingRef.current = false; flush("pause"); });
    player.on("ended", () => { playingRef.current = false; flush("ended"); });
    player.on("seeking", () => { seekingRef.current = true; });
    player.on("seeked", async () => {
      // After a seek, reset the anchor to the landing position — never credit
      // the buckets that were skipped over.
      seekingRef.current = false;
      try {
        const t = await player.getCurrentTime();
        lastMarkedPositionRef.current = t;
        lastPositionRef.current = t;
      } catch (e) { /* noop */ }
    });
    player.on("timeupdate", (data) => {
      // timeupdate is the primary clock; we do NOT use data.percent from the iframe.
      lastPositionRef.current = data.seconds;
      if (!playingRef.current || seekingRef.current) return;
      const prev = lastMarkedPositionRef.current;
      const curr = data.seconds;
      const gap = curr - prev;
      if (curr >= prev && gap <= CONTINUOUS_GAP_THRESHOLD) {
        // Continuous playback: credit every 5s bucket between the last marked
        // position and now (handles sparse timeupdate firing without gaps).
        const startBucket = Math.floor(prev / BUCKET_SECONDS);
        const endBucket = Math.floor(curr / BUCKET_SECONDS);
        let added = false;
        for (let b = startBucket; b <= endBucket; b++) {
          if (b < 0) continue;
          if (!bucketsRef.current.has(b)) {
            bucketsRef.current.add(b);
            dirtyRef.current.add(b);
            added = true;
          }
        }
        if (added) updateLocalStats();
      } else {
        // Discontinuity (large jump / backward): credit only the landing bucket.
        const b = Math.floor(curr / BUCKET_SECONDS);
        if (b >= 0 && !bucketsRef.current.has(b)) {
          bucketsRef.current.add(b);
          dirtyRef.current.add(b);
          updateLocalStats();
        }
      }
      lastMarkedPositionRef.current = curr;
    });
    player.on("error", (err) => {
      console.error("[VimeoTrackedPlayer] player error:", err);
      setError(isDomainPrivacyError(err) ? domainPrivacyMessage() : "Ocurrió un error al reproducir el video. Intenta recargar la página.");
    });

    return () => {
      destroyed = true;
      flush("leave");
      player.destroy().catch(() => {});
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimeoVideoId, vimeoUrl]);

  // Periodic flush + flush on page leave
  useEffect(() => {
    const intervalId = setInterval(() => flush("interval"), FLUSH_INTERVAL_MS);
    const onLeave = () => flush("leave");
    document.addEventListener("visibilitychange", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResume = () => {
    setShowResume(false);
    if (playerRef.current) {
      playerRef.current.setCurrentTime(resumePosition).then(() => playerRef.current.play()).catch(() => {});
    }
  };

  const handleStartOver = () => {
    setShowResume(false);
    if (playerRef.current) {
      playerRef.current.setCurrentTime(0).then(() => playerRef.current.play()).catch(() => {});
    }
  };

  if (notConfigured) {
    return (
      <div className="bg-revive-cream border border-border rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-semibold text-revive-dark">Video no configurado</p>
          <p className="text-sm text-muted-foreground mt-1">Este día aún no tiene video asignado. El equipo de contenidos lo publicará pronto.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-semibold text-red-800">No se pudo cargar el video</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-revive-dark rounded-2xl overflow-hidden">
        <div ref={containerRef} className="w-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-revive-dark/80">
            <Loader2 className="w-8 h-8 animate-spin text-revive-green-light" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-revive-green transition-all duration-300" style={{ width: `${Math.min(100, validPercent)}%` }} />
        </div>
        <span className="text-muted-foreground font-semibold tabular-nums whitespace-nowrap">{Math.round(validPercent)}%</span>
        {completed && <span className="text-revive-green font-semibold text-xs">✓ Completado</span>}
      </div>

      {showResume && !loading && (
        <div className="bg-revive-cream border border-revive-green/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm text-revive-dark">¿Continuar desde {formatTime(resumePosition)}?</span>
          <div className="flex gap-2">
            <button onClick={handleStartOver} className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-white transition-colors">Desde el inicio</button>
            <button onClick={handleResume} className="text-sm px-3 py-1.5 rounded-lg bg-revive-green text-revive-dark font-semibold">Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}