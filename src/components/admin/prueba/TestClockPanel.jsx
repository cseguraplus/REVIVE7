import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CalendarDays } from "lucide-react";

function nextWeekday(fromDateStr, idx) {
  const [y, m, d] = fromDateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const cur = dt.getUTCDay();
  const add = (idx - cur + 7) % 7;
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

export default function TestClockPanel({ settings, generations, effectiveDate, onSetDate, busy }) {
  const [reason, setReason] = useState("");
  const simValue = settings?.simulated_datetime ? String(settings.simulated_datetime).slice(0, 16) : "";

  const setSim = (datetime) =>
    onSetDate({ simulated_datetime: datetime ? `${datetime}:00` : null, reason: reason || undefined });
  const simular = (idx) => {
    const base = effectiveDate || new Date().toISOString().slice(0, 10);
    const date = nextWeekday(base, idx);
    onSetDate({ simulated_datetime: `${date}T12:00:00`, reason: reason || `Simular ${idx === 1 ? "lunes" : "martes"} para pruebas` });
  };
  const volverReal = () => onSetDate({ simulated_datetime: null, test_mode: false, reason: reason || "Volver a fecha real" });
  const toggleTestMode = () => onSetDate({ test_mode: !settings?.test_mode, reason: reason || `test_mode = ${!settings?.test_mode}` });
  const saveGeneration = (genId) => onSetDate({ active_generation_id: genId || null, reason: reason || "Cambio de generación piloto" });

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-revive-dark" />
        <h3 className="font-heading font-semibold text-revive-dark">Reloj de prueba</h3>
      </div>

      <div className="flex items-center justify-between bg-revive-cream rounded-lg p-3">
        <div>
          <p className="text-xs text-muted-foreground">Fecha efectiva actual</p>
          <p className="font-heading font-bold text-revive-dark">{effectiveDate || "—"}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${settings?.test_mode ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
          {settings?.test_mode ? "Modo prueba" : "Fecha real"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <Label>Modo prueba (test_mode)</Label>
        <button
          onClick={toggleTestMode}
          disabled={busy}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings?.test_mode ? "bg-revive-green" : "bg-gray-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings?.test_mode ? "translate-x-6" : ""}`} />
        </button>
      </div>

      <div>
        <Label>Fecha simulada (simulated_datetime)</Label>
        <Input type="datetime-local" value={simValue} onChange={(e) => setSim(e.target.value)} disabled={busy} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={() => simular(1)} disabled={busy}>Simular lunes</Button>
        <Button variant="outline" onClick={() => simular(2)} disabled={busy}>Simular martes</Button>
        <Button variant="outline" onClick={volverReal} disabled={busy}>Fecha real</Button>
      </div>

      <div>
        <Label><CalendarDays className="w-4 h-4 inline mr-1" />Generación piloto activa</Label>
        <select
          value={settings?.active_generation_id || ""}
          onChange={(e) => saveGeneration(e.target.value)}
          disabled={busy}
          className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="">— Ninguna —</option>
          {generations.map((g) => (
            <option key={g.id} value={g.id}>{g.name}{g.status ? ` (${g.status})` : ""}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Resumen diario por correo (envío)</Label>
        <button
          onClick={() => onSetDate({ daily_summary_enabled: !settings?.daily_summary_enabled, reason: reason || `daily_summary_enabled = ${!settings?.daily_summary_enabled}` })}
          disabled={busy}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings?.daily_summary_enabled ? "bg-revive-green" : "bg-gray-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings?.daily_summary_enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      <div>
        <Label>Motivo (auditoría)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Razón del cambio" disabled={busy} />
      </div>
    </div>
  );
}