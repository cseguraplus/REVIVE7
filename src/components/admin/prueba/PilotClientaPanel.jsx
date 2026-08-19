import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, RotateCcw, CalendarClock, AlertTriangle } from "lucide-react";

const statusLabels = { pending: "Pendiente", active: "Activa", paused: "Pausada", completed: "Completada", dropped: "Abandonó" };

export default function PilotClientaPanel({ clientas, selectedId, onSelect, state, onReset, onOverride, busy }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [overrideDay, setOverrideDay] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [err, setErr] = useState(null);

  const doReset = async () => {
    setErr(null);
    try { await onReset(selectedId, resetReason); setResetOpen(false); setResetReason(""); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
  };
  const doOverride = async () => {
    setErr(null);
    try {
      const n = Number(overrideDay);
      if (!n && n !== 0) throw { message: "Indica un número de día" };
      await onOverride(selectedId, n, overrideReason);
      setOverrideDay(""); setOverrideReason("");
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  };

  const enrollment = state?.enrollment || null;
  const vps = state?.videoProgress || [];
  const checkins = state?.checkins || [];
  const completedCheckins = checkins.filter((c) => c.completed).length;

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-revive-dark" />
        <h3 className="font-heading font-semibold text-revive-dark">Clienta de prueba</h3>
      </div>

      <div>
        <Label>Selecciona clienta</Label>
        <select value={selectedId || ""} onChange={(e) => onSelect(e.target.value)} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm">
          <option value="">— Selecciona —</option>
          {clientas.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {statusLabels[c.status] || c.status}</option>
          ))}
        </select>
      </div>

      {!selectedId ? (
        <p className="text-sm text-muted-foreground">Selecciona una clienta para ver su estado y aplicar acciones.</p>
      ) : (
        <>
          {/* State */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-revive-cream rounded-lg p-2.5">
              <p className="text-lg font-heading font-bold text-revive-dark">{vps.length}</p>
              <p className="text-xs text-muted-foreground">VideoProgress</p>
            </div>
            <div className="bg-revive-cream rounded-lg p-2.5">
              <p className="text-lg font-heading font-bold text-revive-dark">{checkins.length}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div className="bg-revive-cream rounded-lg p-2.5">
              <p className="text-lg font-heading font-bold text-revive-dark">{completedCheckins}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
          </div>

          {enrollment && (
            <div className="text-sm bg-muted/40 rounded-lg p-3 space-y-0.5">
              <p><span className="text-muted-foreground">Enrollment:</span> <span className="font-medium text-revive-dark">{enrollment.status} · {enrollment.intensity}</span></p>
              <p><span className="text-muted-foreground">Inicio:</span> <span className="font-medium text-revive-dark">{enrollment.start_date || "—"}</span></p>
              <p><span className="text-muted-foreground">Override:</span> <span className="font-medium text-revive-dark">{enrollment.override_day_number != null ? `Día ${enrollment.override_day_number}` : "ninguno"}</span></p>
            </div>
          )}

          {/* Override day */}
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Override de un día (motivo obligatorio)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Día N" value={overrideDay} onChange={(e) => setOverrideDay(e.target.value)} className="w-24" />
              <Input placeholder="Motivo del override" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
            <Button onClick={doOverride} disabled={busy || !overrideReason.trim()} className="w-full bg-revive-dark hover:bg-revive-dark-mid text-white">
              Aplicar override
            </Button>
          </div>

          {/* Reset */}
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Reiniciar clienta de prueba</Label>
            {!resetOpen ? (
              <Button onClick={() => { setResetOpen(true); setErr(null); }} variant="outline" className="w-full text-red-700 border-red-200 hover:bg-red-50">
                Reiniciar progreso
              </Button>
            ) : (
              <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">Borra DailyCheckin, VideoProgress y el override. Motivo obligatorio.</p>
                </div>
                <Input placeholder="Motivo del reinicio" value={resetReason} onChange={(e) => setResetReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={doReset} disabled={busy || !resetReason.trim()} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirmar reinicio</Button>
                  <Button variant="outline" onClick={() => { setResetOpen(false); setResetReason(""); setErr(null); }} className="flex-1">Cancelar</Button>
                </div>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        </>
      )}
    </div>
  );
}