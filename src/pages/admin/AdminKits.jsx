import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, X, Loader2, Package } from "lucide-react";

const emptyForm = { nombre: "", semana: 1, descripcion: "", precio: "", dias_que_desbloquea: 7, activo: true };

export default function AdminKits() {
  const [kits, setKits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => { const k = await base44.entities.Kit.list("semana"); setKits(k); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setShowForm(true); };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, precio: parseFloat(form.precio) || 0, semana: parseInt(form.semana), dias_que_desbloquea: parseInt(form.dias_que_desbloquea) };
    if (editItem) await base44.entities.Kit.update(editItem.id, data);
    else await base44.entities.Kit.create(data);
    setSaving(false); setShowForm(false); setEditItem(null); setForm(emptyForm); load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Kits Semanales</h1>
          <p className="text-muted-foreground text-sm mt-1">Los 13 kits del programa Revive 7</p>
        </div>
        <button onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }}
          className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-green-light transition-colors">
          <Plus className="w-4 h-4" /> Nuevo kit
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-revive-dark">{editItem ? "Editar kit" : "Nuevo kit"}</h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nombre</label>
              <input type="text" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" /></div>
            <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Semana del programa</label>
              <input type="number" min={1} max={13} required value={form.semana} onChange={e => setForm(p => ({ ...p, semana: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" /></div>
            <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Precio</label>
              <input type="number" step="0.01" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" /></div>
            <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Días que desbloquea</label>
              <input type="number" min={1} max={90} value={form.dias_que_desbloquea} onChange={e => setForm(p => ({ ...p, dias_que_desbloquea: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripción</label>
              <textarea rows={2} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 resize-none" /></div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="px-4 py-2 text-sm font-heading font-semibold text-muted-foreground">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar kit"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {kits.length === 0 && <div className="sm:col-span-3 text-center py-16 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin kits configurados.</p></div>}
        {kits.map(k => (
          <div key={k.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="bg-revive-dark text-white text-xs font-heading font-black px-2.5 py-1 rounded-full">Semana {k.semana}</span>
              <button onClick={() => openEdit(k)} className="text-muted-foreground hover:text-revive-dark"><Pencil className="w-4 h-4" /></button>
            </div>
            <h3 className="font-heading font-bold text-revive-dark mb-1">{k.nombre}</h3>
            {k.descripcion && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{k.descripcion}</p>}
            <div className="flex items-center justify-between">
              <span className="text-revive-green font-heading font-bold text-sm">+{k.dias_que_desbloquea || 7} días</span>
              {k.precio > 0 && <span className="text-revive-dark font-heading font-bold text-sm">${k.precio?.toLocaleString("es-MX")}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}