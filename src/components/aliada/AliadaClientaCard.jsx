import React from "react";
import WhatsAppButton, { buildWhatsAppMessage } from "@/components/aliada/WhatsAppButton";
import { ShieldAlert, AlertTriangle } from "lucide-react";

const emotionalLabels = {
  great: "Genial 😊", good: "Bien 🙂", neutral: "Neutral 😐", low: "Bajón 🙁", bad: "Difícil 😣",
};
const statusLabels = {
  pending: "Pendiente", active: "Activa", paused: "Pausada", completed: "Completada", dropped: "Abandonó",
};
const checkinShort = { completed: "Listo", in_progress: "Progreso", none: "Pendiente" };

function ReasonBadges({ clienta }) {
  const badges = [];
  if (clienta.incomplete_previous_day) badges.push({ label: "Día anterior incompleto", cls: "bg-amber-100 text-amber-800" });
  if (clienta.con_dificultad) badges.push({ label: "Con dificultad", cls: "bg-rose-100 text-rose-700" });
  if (clienta.inactive_2_days) badges.push({ label: "Sin actividad 2 días", cls: "bg-orange-100 text-orange-700" });
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <span key={i} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
      ))}
    </div>
  );
}

export default function AliadaClientaCard({ clienta, aliadaName, showReasons = true }) {
  const name = clienta.full_name || `Clienta ${(clienta.clienta_id || "").slice(-6)}`;
  const message = buildWhatsAppMessage(clienta, aliadaName);
  const dotColor = clienta.checkin_status === "completed"
    ? "bg-revive-green"
    : clienta.checkin_status === "in_progress"
      ? "bg-amber-400"
      : "bg-gray-300";

  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-revive-dark leading-tight truncate">{name}</h3>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-1 ${clienta.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {statusLabels[clienta.status] || clienta.status}
          </span>
        </div>
        {clienta.safety_flag && (
          <span className="inline-flex items-center gap-1 text-xs font-heading font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
            <ShieldAlert className="w-3.5 h-3.5" /> Requiere orientación profesional
          </span>
        )}
      </div>

      {showReasons && <ReasonBadges clienta={clienta} />}

      {clienta.alert && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{clienta.alert.reason || clienta.alert.type}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-revive-cream rounded-lg p-2.5 text-center">
          <p className="text-xl font-heading font-bold text-revive-dark">{clienta.current_day_number != null ? clienta.current_day_number : "—"}</p>
          <p className="text-xs text-muted-foreground">Día actual</p>
        </div>
        <div className="bg-revive-cream rounded-lg p-2.5 text-center">
          <p className="text-xl font-heading font-bold text-revive-dark">{Math.round(clienta.valid_percent || 0)}%</p>
          <p className="text-xs text-muted-foreground">Video válido</p>
        </div>
        <div className="bg-revive-cream rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5 h-6">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
            <span className="text-sm font-heading font-semibold text-revive-dark">{checkinShort[clienta.checkin_status]}</span>
          </div>
          <p className="text-xs text-muted-foreground">Check-in</p>
        </div>
      </div>

      {clienta.emotional_state && (
        <div className="text-sm">
          <span className="text-muted-foreground">Cómo se siente: </span>
          <span className="font-medium text-revive-dark">{emotionalLabels[clienta.emotional_state] || clienta.emotional_state}</span>
          {clienta.emotional_comment && (
            <p className="text-muted-foreground italic mt-0.5">"{clienta.emotional_comment}"</p>
          )}
        </div>
      )}

      <WhatsAppButton phone={clienta.phone} message={message} />
    </div>
  );
}