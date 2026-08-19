import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Loader2, Search } from "lucide-react";

const estadoStyle = { activa: "bg-revive-green-pale text-revive-dark", pendiente_recompra: "bg-yellow-100 text-yellow-700", vencida: "bg-red-100 text-red-600", completada: "bg-blue-100 text-blue-700" };
const estadoLabel = { activa: "Activa", pendiente_recompra: "Pendiente recompra", vencida: "Vencida", completada: "Completada" };

export default function VendedoraClientas() {
  const [vendedora, setVendedora] = useState(null);
  const [clientas, setClientas] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const me = await base44.auth.me();
    const vs = await base44.entities.Vendedora.filter({ user_id: me.id });
    if (vs.length > 0) {
      setVendedora(vs[0]);
      const cl = await base44.entities.Clienta.filter({ vendedora_id: vs[0].id });
      setClientas(cl);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    await base44.entities.Clienta.create({
      ...form, vendedora_id: vendedora.id, codigo_aliada: vendedora.codigo_aliada,
      estado: "activa", dias_desbloqueados: 0,
      fecha_inicio: new Date().toISOString().split("T")[0],
    });
    setSaving(false); setShowForm(false); setForm({ nombre: "", email: "", telefono: "", notas: "" }); load();
  };

  const filtered = clientas.filter(c =>
    c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Mis Clientas</h1>
          <p className="text-muted-foreground text-sm mt-1">{clientas.length} clientas en tu red</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-green-light transition-colors">
          <Plus className="w-4 h-4" /> Nueva clienta
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-revive-dark">Registrar nueva clienta</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ f: "nombre", l: "Nombre completo", t: "text" }, { f: "email", l: "Email", t: "email" }, { f: "telefono", l: "Teléfono", t: "tel" }].map(({ f, l, t }) => (
              <div key={f}>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">{l}</label>
                <input type={t} required={f !== "telefono"} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</label>
              <input type="text" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional..."
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-heading font-semibold text-muted-foreground">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar clienta"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clienta..."
          className="w-full pl-9 pr-4 py-2.5 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center py-16 text-muted-foreground text-sm">Sin clientas registradas aún.</div>}
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-revive-green flex items-center justify-center text-white font-heading font-bold flex-shrink-0">
              {c.nombre?.[0] || "?"}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-heading font-bold text-revive-dark">{c.nombre}</p>
                <span className={`text-xs font-heading font-bold px-2.5 py-0.5 rounded-full ${estadoStyle[c.estado] || "bg-muted text-muted-foreground"}`}>
                  {estadoLabel[c.estado] || c.estado}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{c.email} {c.telefono && `· ${c.telefono}`}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-heading font-bold text-revive-dark text-lg">{c.dias_desbloqueados || 0}</p>
                <p className="text-xs text-muted-foreground">días de 90</p>
              </div>
              <div className="w-24">
                <div className="bg-border rounded-full h-2">
                  <div className="bg-revive-green h-2 rounded-full" style={{ width: `${Math.min(100, ((c.dias_desbloqueados || 0) / 90) * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.round(((c.dias_desbloqueados || 0) / 90) * 100)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}