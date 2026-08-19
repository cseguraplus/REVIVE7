import React, { useState } from "react";
import { Loader2 } from "lucide-react";

const FIELDS = [
  { key: "weight", label: "Peso (kg)", type: "number" },
  { key: "waist", label: "Cintura (cm)", type: "number" },
  { key: "energy", label: "Energía (1-10)", type: "number", min: 1, max: 10 },
  { key: "sleep", label: "Sueño (1-10)", type: "number", min: 1, max: 10 },
  { key: "digestion", label: "Digestión (1-10)", type: "number", min: 1, max: 10 },
  { key: "stress", label: "Estrés (1-10)", type: "number", min: 1, max: 10 },
];

export default function InitialMetricsForm({ initial = {}, onSave }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setValues((p) => ({ ...p, [k]: v })); setSaved(false); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(values);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1.5">{f.label}</label>
            <input
              type={f.type}
              min={f.min}
              max={f.max}
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="bg-revive-green text-revive-dark font-heading font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Guardando..." : "Guardar indicadores"}
        </button>
        {saved && <span className="text-sm text-revive-green font-semibold">✓ Guardado</span>}
      </div>
    </form>
  );
}