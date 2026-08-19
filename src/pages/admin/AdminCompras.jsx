import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Loader2 } from "lucide-react";

const emptyForm = { clienta_id: "", vendedora_id: "", kit_nombre: "", semana_numero: 1, monto: "", fecha_compra: new Date().toISOString().split("T")[0], notas: "" };

export default function AdminCompras() {
  const [compras, setCompras] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [co, cl, v] = await Promise.all([
      base44.entities.Compra.list("-fecha_compra", 200),
      base44.entities.Clienta.list(),
      base44.entities.Vendedora.list(),
    ]);
    setCompras(co); setClientas(cl); setVendedoras(v); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clientaMap = Object.fromEntries(clientas.map(c => [c.id, c]));
  const vendedoraMap = Object.fromEntries(vendedoras.map(v => [v.id, v.nombre]));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const clienta = clientaMap[form.clienta_id];
    const nuevosDias = (clienta?.dias_desbloqueados || 0) + 7;

    await base44.entities.Compra.create({ ...form, dias_desbloqueados: 7, monto: parseFloat(form.monto) || 0 });

    // Update clienta days + status
    await base44.entities.Clienta.update(form.clienta_id, {
      dias_desbloqueados: Math.min(nuevosDias, 90),
      estado: nuevosDias >= 90 ? "completada" : "activa",
      vendedora_id: form.vendedora_id || clienta?.vendedora_id,
    });

    setSaving(false); setShowForm(false); setForm(emptyForm); load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Compras / Kits</h1>
          <p className="text-muted-foreground text-sm mt-1">Registro de compras semanales — cada compra desbloquea 7 días</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-green-light transition-colors">
          <Plus className="w-4 h-4" /> Registrar compra
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-revive-dark">Nueva compra — desbloquea 7 días</h2>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Clienta</label>
              <select required value={form.clienta_id} onChange={e => {
                const c = clientaMap[e.target.value];
                setForm(p => ({ ...p, clienta_id: e.target.value, vendedora_id: c?.vendedora_id || "" }));
              }} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
                <option value="">Seleccionar clienta</option>
                {clientas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.dias_desbloqueados || 0} días actuales)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Vendedora</label>
              <select value={form.vendedora_id} onChange={e => setForm(p => ({ ...p, vendedora_id: e.target.value }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
                <option value="">Sin asignar</option>
                {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kit / Semana</label>
              <select value={form.semana_numero} onChange={e => setForm(p => ({ ...p, semana_numero: parseInt(e.target.value), kit_nombre: `Kit Semana ${e.target.value}` }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
                {Array.from({ length: 13 }, (_, i) => <option key={i + 1} value={i + 1}>Semana {i + 1} — Kit S{i + 1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Monto</label>
              <input type="number" step="0.01" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="0.00" className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fecha de compra</label>
              <input type="date" required value={form.fecha_compra} onChange={e => setForm(p => ({ ...p, fecha_compra: e.target.value }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</label>
              <input type="text" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Opcional..." className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
            </div>
            <div className="md:col-span-2 bg-revive-green-pale rounded-xl p-4 border border-revive-green/20">
              <p className="text-revive-dark font-heading font-semibold text-sm">✓ Esta compra desbloqueará <strong>7 días adicionales</strong> del programa Revive 7.</p>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 text-sm font-heading font-semibold text-muted-foreground">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-revive-dark-mid transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar y desbloquear"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-revive-cream/50 border-b border-border">
            <tr>
              {["Fecha", "Clienta", "Vendedora", "Kit / Semana", "Días desbloqueados", "Monto"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-heading font-semibold text-revive-dark text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {compras.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Sin compras registradas.</td></tr>}
            {compras.map(c => (
              <tr key={c.id} className="hover:bg-revive-cream/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{c.fecha_compra}</td>
                <td className="px-4 py-3 font-heading font-semibold text-revive-dark">{clientaMap[c.clienta_id]?.nombre || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{vendedoraMap[c.vendedora_id] || "—"}</td>
                <td className="px-4 py-3"><span className="bg-revive-green-pale text-revive-dark text-xs font-heading font-bold px-2.5 py-1 rounded-full">{c.kit_nombre || `Semana ${c.semana_numero}`}</span></td>
                <td className="px-4 py-3 font-heading font-bold text-revive-green">+{c.dias_desbloqueados || 7} días</td>
                <td className="px-4 py-3 font-heading font-semibold text-revive-dark">{c.monto ? `$${c.monto.toLocaleString("es-MX")}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}