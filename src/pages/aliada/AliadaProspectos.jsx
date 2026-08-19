import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, Plus, X, Save } from "lucide-react";

const STATUSES = [
  { key: "nuevo", label: "Nuevo" },
  { key: "contactado", label: "Contactado" },
  { key: "interesado", label: "Interesado" },
  { key: "pendiente", label: "Pendiente" },
  { key: "compra_realizada", label: "Compra realizada" },
  { key: "no_interesado", label: "No interesado" },
  { key: "seguimiento_futuro", label: "Seguimiento futuro" },
];

const STATUS_COLOR = {
  nuevo: "bg-blue-100 text-blue-700",
  contactado: "bg-amber-100 text-amber-700",
  interesado: "bg-revive-green-pale text-revive-dark",
  pendiente: "bg-orange-100 text-orange-700",
  compra_realizada: "bg-green-200 text-green-800",
  no_interesado: "bg-gray-200 text-gray-600",
  seguimiento_futuro: "bg-purple-100 text-purple-700",
};

export default function AliadaProspectos() {
  const [profile, setProfile] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", origen: "", interes: "", next_action: "", next_action_date: "", status: "nuevo", nota: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const cps = await base44.entities.AliadaProfile.filter({ user_id: me.id });
      const p = cps && cps[0];
      setProfile(p || null);
      const list = await base44.entities.Prospect.list("-created_date", 200);
      setProspects(list || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nombre: "", telefono: "", origen: "", interes: "", next_action: "", next_action_date: "", status: "nuevo", nota: "" }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ nombre: p.nombre || "", telefono: p.telefono || "", origen: p.origen || "", interes: p.interes || "", next_action: p.next_action || "", next_action_date: p.next_action_date || "", status: p.status || "nuevo", nota: p.nota || "" }); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) { setError("Nombre y teléfono son obligatorios."); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...form, aliada_id: profile?.id };
      if (editing) {
        await base44.entities.Prospect.update(editing.id, payload);
      } else {
        await base44.entities.Prospect.create(payload);
      }
      setShowForm(false);
      await load();
    } catch (err) { setError(err.message || "No se pudo guardar."); }
    finally { setSaving(false); }
  };

  const quickStatus = async (p, status) => {
    try { await base44.entities.Prospect.update(p.id, { status }); await load(); } catch (e) { /* ignore */ }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Prospectos</h1>
          <p className="text-sm text-muted-foreground">Tu CRM básico. El contacto es manual.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-4 py-2.5 rounded-xl">
          <Plus className="w-4 h-4" /> Nuevo prospecto
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-revive-dark">{editing ? "Editar prospecto" : "Nuevo prospecto"}</h2>
            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2" />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2" />
            <input placeholder="Origen" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            <input placeholder="Interés" value={form.interes} onChange={(e) => setForm({ ...form, interes: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            <input placeholder="Próxima acción" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            <input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm bg-white col-span-2">
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <textarea placeholder="Nota" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} rows={2} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </form>
      )}

      {prospects.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground">Aún no tienes prospectos. Agrega tu primero.</div>
      ) : (
        <div className="space-y-3">
          {prospects.map((p) => (
            <div key={p.id} className="bg-white border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-revive-dark truncate">{p.nombre}</h3>
                  <p className="text-xs text-muted-foreground">{p.telefono}{p.origen ? ` · ${p.origen}` : ""}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] || "bg-gray-100"}`}>{STATUSES.find((s) => s.key === p.status)?.label || p.status}</span>
              </div>
              {p.interes && <p className="text-sm text-muted-foreground">Interés: <span className="text-revive-dark">{p.interes}</span></p>}
              {(p.next_action || p.next_action_date) && (
                <p className="text-xs text-muted-foreground">Próxima acción: {p.next_action || "—"} {p.next_action_date ? `· ${new Date(p.next_action_date + "T00:00:00").toLocaleDateString("es-MX")}` : ""}</p>
              )}
              {p.nota && <p className="text-xs text-muted-foreground italic">{p.nota}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STATUSES.map((s) => (
                  <button key={s.key} onClick={() => quickStatus(p, s.key)} className={`text-[11px] px-2 py-1 rounded-full border ${p.status === s.key ? "bg-revive-dark text-white border-revive-dark" : "bg-white border-border text-muted-foreground"}`}>{s.label}</button>
                ))}
                <button onClick={() => openEdit(p)} className="text-[11px] px-2 py-1 rounded-full border border-border text-revive-dark ml-auto">Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}