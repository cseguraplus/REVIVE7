import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, CalendarDays, RefreshCw, Pencil, X, Save } from "lucide-react";
import { EmptyState, SearchInput, Pagination, ConfirmDialog, StatCard, useAdminList } from "@/components/admin/AdminUI";

const STATUS_LABEL = { draft: "Borrador", open: "Abierta", closed: "Cerrada", archived: "Archivada" };
const STATUS_COLOR = { draft: "bg-gray-100 text-gray-600", open: "bg-green-100 text-green-700", closed: "bg-amber-100 text-amber-700", archived: "bg-gray-200 text-gray-500" };

function fmt(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

export default function AdminGeneraciones() {
  const [generations, setGenerations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", enrollment_cutoff: "", status: "open" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [ensuring, setEnsuring] = useState(false);

  const load = async () => {
    try {
      const [gens, enrs] = await Promise.all([
        base44.entities.Generation.list("-start_date", 100),
        base44.entities.Enrollment.list("-created_date", 500),
      ]);
      setGenerations(gens || []);
      setEnrollments(enrs || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const inscritas = (gid) => (enrollments || []).filter((e) => e.generation_id === gid).length;
  const excepciones = (gid) => (enrollments || []).filter((e) => e.generation_id === gid && (e.override_day_number != null || e.override_reason)).length;

  const openNew = () => { setEditing(null); setForm({ name: "", start_date: "", end_date: "", enrollment_cutoff: "", status: "open" }); setShowForm(true); };
  const openEdit = (g) => { setEditing(g); setForm({ name: g.name, start_date: g.start_date || "", end_date: g.end_date || "", enrollment_cutoff: (g.enrollment_cutoff || "").slice(0, 16), status: g.status }); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, enrollment_cutoff: form.enrollment_cutoff ? new Date(form.enrollment_cutoff).toISOString() : null };
      if (editing) await base44.entities.Generation.update(editing.id, payload);
      else await base44.entities.Generation.create(payload);
      setShowForm(false);
      await load();
    } catch (err) { /* ignore */ }
    finally { setSaving(false); }
  };

  const ensureUpcoming = async () => {
    setEnsuring(true);
    try { await base44.functions.invoke("ensureUpcomingGenerations", {}); await load(); } catch (e) { /* ignore */ }
    finally { setEnsuring(false); }
  };

  const list = useAdminList({
    items: generations,
    filterFn: (g, s) => (g.name || "").toLowerCase().includes(s.toLowerCase()),
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Generaciones</h1>
          <p className="text-sm text-muted-foreground">Calendario, corte de inscripción, inscritas y excepciones.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={ensureUpcoming} disabled={ensuring} className="flex items-center gap-2 bg-white border border-border text-revive-dark font-heading font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
            {ensuring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generar próximas
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nueva
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={generations.length} icon={CalendarDays} />
        <StatCard label="Abiertas" value={generations.filter((g) => g.status === "open").length} />
        <StatCard label="Inscritas (todas)" value={enrollments.length} />
        <StatCard label="Excepciones" value={generations.reduce((n, g) => n + excepciones(g.id), 0)} />
      </div>

      <SearchInput value={list.search} onChange={(v) => { list.setSearch(v); list.setPage(1); }} placeholder="Buscar generación…" />

      {list.total === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin generaciones" hint="Crea la primera o genera las próximas automáticamente." />
      ) : (
        <div className="space-y-2">
          {list.paged.map((g) => (
            <div key={g.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading font-semibold text-revive-dark truncate">{g.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(g.start_date)} → {fmt(g.end_date)} · Corte: {g.enrollment_cutoff ? new Date(g.enrollment_cutoff).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{inscritas(g.id)} inscritas{excepciones(g.id) ? ` · ${excepciones(g.id)} excepciones` : ""}</p>
              </div>
              <button onClick={() => openEdit(g)} className="p-2 rounded-lg border border-border text-revive-dark hover:bg-muted/40"><Pencil className="w-4 h-4" /></button>
            </div>
          ))}
          <Pagination page={list.page} totalPages={list.totalPages} onPage={list.setPage} />
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-revive-dark">{editing ? "Editar generación" : "Nueva generación"}</h2>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Inicio (lunes)</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" /></div>
              <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Fin (domingo)</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" /></div>
            </div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Cierre de inscripción</label><input type="datetime-local" value={form.enrollment_cutoff} onChange={(e) => setForm({ ...form, enrollment_cutoff: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" /></div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
              {Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}