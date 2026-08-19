// Parser de enlaces completos de Vimeo. Conserva siempre el enlace original;
// extrae video_id y privacy_hash (hash de videos no listados / privados).
export function parseVimeoUrl(url) {
  const s = (url || "").toString().trim();
  if (!s) return { video_id: "", privacy_hash: "" };
  let video_id = "";
  let privacy_hash = "";

  try {
    const u = new URL(s);
    const h = u.searchParams.get("h");
    if (h) privacy_hash = h;
    const parts = u.pathname.split("/").filter(Boolean);
    const idIdx = parts.findIndex((p) => /^\d{6,}$/.test(p));
    if (idIdx >= 0) {
      video_id = parts[idIdx];
      if (!privacy_hash && parts[idIdx + 1] && /^[a-z0-9]{6,}$/i.test(parts[idIdx + 1])) {
        privacy_hash = parts[idIdx + 1];
      }
    }
  } catch (e) {
    const m = s.match(/(\d{6,})/);
    if (m) video_id = m[1];
    const hm = s.match(/[?&]h=([a-z0-9]{6,})/i);
    if (hm) privacy_hash = hm[1];
  }

  return { video_id, privacy_hash };
}

export function vimeoEmbedUrl(video_id, privacy_hash) {
  if (!video_id) return "";
  return privacy_hash
    ? `https://player.vimeo.com/video/${video_id}?h=${privacy_hash}`
    : `https://player.vimeo.com/video/${video_id}`;
}