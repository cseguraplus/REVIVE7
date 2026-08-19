import React from "react";
import { MessageCircle } from "lucide-react";

export function buildWhatsAppMessage(clienta, aliadaName) {
  const name = clienta.full_name || "clienta";
  const aliada = aliadaName || "tu aliada";
  const day = clienta.current_day_number != null ? `Día ${clienta.current_day_number}` : "tu día";
  const pct = Math.round(clienta.valid_percent || 0);
  let msg = `Hola ${name}, soy ${aliada} de Revive 7. 💚\nVi tu avance de hoy (${day}, ${pct}% de tu video). ¿Cómo te sientes? Estoy aquí para acompañarte.`;
  if (clienta.con_dificultad) msg += `\n\nNoté que no has estado muy bien. ¿Quieres que platiquemos?`;
  if (clienta.incomplete_previous_day) msg += `\n\nAyer no cerraste tu día. ¿Te ayudo a retomarlo con calma?`;
  if (clienta.inactive_2_days) msg += `\n\nTe extrañamos estos días. ¿Todo bien? Aquí estoy cuando quieras.`;
  return msg;
}

export default function WhatsAppButton({ phone, message }) {
  if (!phone) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
      >
        <MessageCircle className="w-4 h-4" /> Sin teléfono
      </button>
    );
  }
  const clean = String(phone).replace(/[^\d]/g, "");
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-heading font-semibold hover:opacity-90 transition-opacity w-full justify-center"
    >
      <MessageCircle className="w-4 h-4" /> WhatsApp
    </a>
  );
}