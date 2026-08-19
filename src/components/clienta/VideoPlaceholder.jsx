import React from "react";
import { PlayCircle } from "lucide-react";

export default function VideoPlaceholder() {
  return (
    <div className="relative aspect-video bg-revive-dark rounded-2xl flex flex-col items-center justify-center text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white,transparent)]" />
      <PlayCircle className="w-16 h-16 text-revive-green-light mb-3 relative z-10" />
      <p className="font-heading font-semibold text-lg relative z-10">Video de Bienvenida</p>
      <p className="text-white/60 text-sm relative z-10">Próximamente: reproductor Vimeo</p>
    </div>
  );
}