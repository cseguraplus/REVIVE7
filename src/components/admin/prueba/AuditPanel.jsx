import React from "react";
import { ScrollText, AlertCircle, Video } from "lucide-react";

function parseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (e) { return str; }
}

// Detects likely player/tracking anomalies from VideoProgress records
function playerErrors(videoProgress) {
  const errs = [];
  for (const vp of videoProgress) {
    const req = vp.required_percent || 80;
    if (vp.valid_percent >= req && !vp.completed) {
      errs.push({ program_day_id: vp.program_day_id, msg: `% válido (${vp.valid_percent}%) ≥ requerido (${req}%) pero no marcado completado` });
    }
    if (vp.duration_seconds && vp.duration_seconds === 0) {
      errs.push({ program_day_id: vp.program_day_id, msg: "duration_seconds = 0 (video sin duración)" });
    }
    if (vp.last_position_seconds > 0 && (!vp.unique_watched_seconds || vp.unique_watched_seconds === 0)) {
      errs.push({ program_day_id: vp.program_day_id, msg: "Hay posición pero 0 segundos únicos vistos" });
    }
  }
  return errs;
}

export default function AuditPanel({ auditLogs, videoProgress }) {
  const errors = videoProgress ? playerErrors(videoProgress) : [];

  return (
    <div className="space-y-4">
      {/* AuditLog */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-revive-dark" />
          <h3 className="font-heading font-semibold text-revive-dark">AuditLog</h3>
        </div>
        {(!auditLogs || auditLogs.length === 0) ? (
          <p className="text-sm text-muted-foreground">Sin registros de auditoría.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {auditLogs.map((a) => {
              const oldV = parseJson(a.old_value_json);
              const newV = parseJson(a.new_value_json);
              return (
                <div key={a.id} className="border-l-2 border-revive-green pl-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-heading font-semibold text-revive-dark">{a.action}</p>
                    <span className="text-xs text-muted-foreground">{a.timestamp ? String(a.timestamp).slice(0, 19) : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.entity_type} · {a.reason || "sin motivo"}</p>
                  <div className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="text-red-600">Antes: {oldV ? JSON.stringify(oldV) : "—"}</span>
                    <span className="text-green-700">Después: {newV ? JSON.stringify(newV) : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Player errors */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-revive-dark" />
          <h3 className="font-heading font-semibold text-revive-dark">Errores del player</h3>
        </div>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{videoProgress ? "Sin anomalías detectadas en VideoProgress." : "Selecciona una clienta para revisar su player."}</p>
        ) : (
          <div className="space-y-2">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{e.msg} <span className="text-xs text-amber-600">({e.program_day_id?.slice(-6)})</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}