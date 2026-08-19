import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Copy, CheckCircle, X, Loader2 } from "lucide-react";

const emptyForm = { nombre: "", email: "", telefono: "", codigo_aliada: "" };

export default function AdminVendedoras() {
  const [vendedoras, setVendedoras] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [v, c] = await Promise.all([base44.entities.Vendedora.list(), base44.entities.Clienta.list()]);
    setVendedoras(v); setClientas(c); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Vendedora.create(form);
    setSaving(false); setShowForm(false); setForm(emptyForm); load();
  };

  const genCodigo = () => {
    const code = "ALI" + Math.random().toString(36).substring(2, 7).toUpperCase();
    setForm(p => ({ ...p, codigo_aliada: code }));
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Vendedoras</h1>
          <p className="text-muted-foreground text-sm mt-1">{vendedoras.length} aliadas registradas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-green-light transition-colors">
          <Plus className="w-4 h-4" /> Nueva vendedora
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-revive-dark">Nueva vendedora</h2>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ f: "nombre", l: "Nombre completo", t: "text" }, { f: "email", l: "Email", t: "email" }, { f: "telefono", l: "Teléfono", t: "tel" }].map(({ f, l, t }) => (
              <div key={f}>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">{l}</label>
                <input type={t} required value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Código aliada</label>
              <div className="flex gap-2">
                <input type="text" required value={form.codigo_aliada} onChange={e => setForm(p => ({ ...p, codigo_aliada: e.target.value }))}
                  className="flex-1 border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                <button type="button" onClick={genCodigo} className="px-3 py-2 bg-revive-green-pale text-revive-dark text-xs font-heading font-semibold rounded-lg hover:bg-revive-green/20 transition-colors">Auto</button>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 text-sm font-heading font-semibold text-muted-foreground hover:text-foreground">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-revive-dark-mid transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar vendedora"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-revive-cream/50 border-b border-border">
            <tr>
              {["Nombre", "Email", "Teléfono", "Código aliada", "Clientas", "Enlace", "Estado"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-heading font-semibold text-revive-dark text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendedoras.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Sin vendedoras registradas.</td></tr>
            )}
            {vendedoras.map(v => {
              const misClientas = clientas.filter(c => c.vendedora_id === v.id).length;
              const link = `${window.location.origin}/registro?aliada=${v.codigo_aliada}`;
              return (
                <tr key={v.id} className="hover:bg-revive-cream/30 transition-colors">
                  <td className="px-4 py-3 font-heading font-semibold text-revive-dark">{v.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.telefono}</td>
                  <td className="px-4 py-3"><span className="font-mono bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded text-xs font-bold">{v.codigo_aliada}</span></td>
                  <td className="px-4 py-3 font-heading font-bold text-revive-dark">{misClientas}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => copy(link, v.id)} className="flex items-center gap-1 text-revive-green hover:text-revive-dark transition-colors text-xs font-heading font-semibold">
                      {copied === v.id ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === v.id ? "¡Copiado!" : "Copiar enlace"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-heading font-bold ${v.activa !== false ? "bg-revive-green-pale text-revive-dark" : "bg-muted text-muted-foreground"}`}>
                      {v.activa !== false ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}