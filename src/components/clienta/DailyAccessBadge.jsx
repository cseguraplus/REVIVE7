import React from "react";
import { Lock, CalendarClock, PlayCircle, Clock, CheckCircle2, Sparkles } from "lucide-react";

// Positive, non-punitive messaging for each daily access state.
const STATE_CONFIG = {
  welcome: {
    icon: Sparkles, color: "text-revive-green", bg: "bg-revive-green-pale", ring: "ring-revive-green/20",
    label: "Bienvenida",
    message: "Tu viaje está por comenzar. Disfruta este momento de preparación. 🌱",
  },
  locked_date: {
    icon: CalendarClock, color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200",
    label: "Se abre pronto",
    message: "Retoma tu proceso. Tu contenido llegará en su momento, con cariño. 🗓️",
  },
  locked_previous: {
    icon: Lock, color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200",
    label: "Primero el día anterior",
    message: "Completa tu día anterior para continuar. ✨",
  },
  available: {
    icon: PlayCircle, color: "text-revive-green", bg: "bg-revive-green-pale", ring: "ring-revive-green/20",
    label: "Listo para comenzar",
    message: "¡Tu día está listo! Avanza a tu propio ritmo y disfrútalo. 💚",
  },
  in_progress: {
    icon: Clock, color: "text-revive-dark", bg: "bg-revive-cream", ring: "ring-revive-green/20",
    label: "En progreso",
    message: "Vas muy bien. Ya casi cierras tu día, sigue así. 🌿",
  },
  completed: {
    icon: CheckCircle2, color: "text-revive-green", bg: "bg-revive-green-pale", ring: "ring-revive-green/30",
    label: "Día completado",
    message: "¡Felicidades! Cuidaste de ti hoy. Descansa y nos vemos mañana. 🎉",
  },
  not_found: {
    icon: Lock, color: "text-muted-foreground", bg: "bg-muted", ring: "ring-border",
    label: "Sin contenido aún",
    message: "Aún no hay contenido publicado para este día.",
  },
};

export default function DailyAccessBadge({ status, availableFrom, compact = false }) {
  const cfg = STATE_CONFIG[status] || STATE_CONFIG.not_found;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl p-4 ${cfg.bg} ring-1 ${cfg.ring}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`font-heading font-bold text-sm ${cfg.color}`}>{cfg.label}</p>
          {!compact && <p className="text-sm text-revive-dark/80 mt-0.5 leading-relaxed">{cfg.message}</p>}
          {!compact && availableFrom && status === "locked_date" && (
            <p className="text-xs text-amber-700/80 mt-1.5 font-medium">Disponible a partir del {availableFrom}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { STATE_CONFIG };