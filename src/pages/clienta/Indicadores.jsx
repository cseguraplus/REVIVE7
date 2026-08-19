import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Save, Activity } from "lucide-react";

const FIELDS = [
  { key: "weight", label: "Peso (kg)", type: "number" },
  { key: "waist", label: "Cintura (cm)", type: "number" },
  { key: "energy", label: "Energía (1-10)", type: "number" },
  { key: "sleep", label: "Sueño (1-10)", type: "number" },
  { key: "digestion", label: "Digestión (1-10)", type: "number" },
  { key: "stress", label: "Estrés (1-10)", type: "number" },
];

const CAPTURE_LABEL = { initial: "Inicio de semana", weekly: "Cierre de semana", final: "Cierre final" };

export default function Indicadores() {
  const { user: me } = useAuth();
  const [access, setAccess] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState({ weight: "", waist: "", energy: "", sleep: "", digestion: "", stress: "", notes: "" });
  const [captureType, setCaptureType] = useState("weekly");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const [a, m] = await Promise.all([
          base44.functions.invoke("getDailyAccess", { clientaId: me.id }),
          base44.entities.WeeklyMetrics.filter({ clienta_id: me.id }),
        ]);
        setAccess(a?.data || null);
        setMetrics(m || []);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [me]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const payload = {
        clienta_id: me.id,
        enrollment_id: access?.enrollment_id || undefined,
        capture_type: captureType,
        weight: form.weight ? Number(form.weight) : undefined,
        waist: form.waist ? Number(form.waist) : undefined,
        energy: form.energy ? Number(form.energy) : undefined,
        sleep: form.sleep ? Number(form.sleep) : undefined,
        digestion: form.digestion ? Number(form.digestion) : undefined,
        stress: form.stress ? Number(form.stress) : undefined,
        notes: form.notes.trim() || undefined,
      };
      await base44.entities.WeeklyMetrics.create(payload);
      const m = await base44.entities.WeeklyMetrics.filter({ clienta_id: me.id });
      setMetrics(m || []);
      setForm({ weight: "", waist: "", energy: "", sleep: "", digestion: "", stress: "", notes: "" });
      setSavedMsg("Indicadores guardados. Gracias por registrarte. 💚");
    } catch (err) {
      setSavedMsg(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Indicadores</h1>
        <p className="text-sm text-muted-foreground">Registro opcional al inicio y cierre de cada semana.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1.5">Tipo de captura</label>
          <select value={captureType} onChange={(e) => setCaptureType(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="initial">Inicio de semana</option>
            <option value="weekly">Cierre de semana</option>
            <option value="final">Cierre final</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1.5">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1.5">Notas</label>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 resize-none" />
        </div>
        {savedMsg && <p className="text-sm text-revive-green font-heading font-semibold">{savedMsg}</p>}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar indicadores</>}
        </button>
      </form>

      {metrics.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-heading font-bold text-revive-dark text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-revive-green" /> Registros previos</h2>
          <div className="space-y-2">
            {metrics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map((m) => (
              <div key={m.id} className="bg-revive-cream rounded-lg px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-revive-dark">{CAPTURE_LABEL[m.capture_type] || m.capture_type}</span>
                  <span className="text-muted-foreground">{m.created_date ? new Date(m.created_date).toLocaleDateString("es-MX") : ""}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-muted-foreground">
                  {m.weight ? <span>Peso {m.weight}kg</span> : null}
                  {m.waist ? <span>Cintura {m.waist}cm</span> : null}
                  {m.energy ? <span>Energía {m.energy}/10</span> : null}
                  {m.sleep ? <span>Sueño {m.sleep}/10</span> : null}
                  {m.digestion ? <span>Digestión {m.digestion}/10</span> : null}
                  {m.stress ? <span>Estrés {m.stress}/10</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}