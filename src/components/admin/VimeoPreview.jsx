import React from "react";
import { vimeoEmbedUrl } from "@/lib/vimeo";
import { Film } from "lucide-react";

export default function VimeoPreview({ video_id, privacy_hash, className = "" }) {
  if (!video_id) {
    return (
      <div className={`flex items-center justify-center aspect-video w-full rounded-xl bg-revive-cream border border-dashed border-border ${className}`}>
        <div className="text-center text-muted-foreground">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">Sin video configurado</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`aspect-video w-full rounded-xl overflow-hidden bg-black border border-border ${className}`}>
      <iframe
        src={vimeoEmbedUrl(video_id, privacy_hash)}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        frameBorder="0"
        title="Vimeo preview"
      />
    </div>
  );
}