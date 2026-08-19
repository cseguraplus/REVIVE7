import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, Pencil, X, Save, BookOpen, GraduationCap, BarChart3, CheckCircle2 } from "lucide-react";
import { EmptyState, SearchInput, useAdminList } from "@/components/admin/AdminUI";

const TABS = [
  { key: "modulos", label: "Módulos", icon: BookOpen },
  { key: "examenes", label: "Evaluación", icon: GraduationCap },
  { key: "avance", label: "Avance", icon: BarChart3 },
];

export default function AdminCapacitacion() {
  const [tab, setTab] = useState("modulos");
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [progress, setProgress] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [m, ex, pr, us] = await Promise.all([
        base44.entities.TrainingModule.list("sort_order", 100),
        base44.entities.TrainingExam.list("-created_date", 100),
        base44.entities.TrainingProgress.list("-updated_date", 200),
        base44.entities.User.list("-created_date", 200),
      ]);
      setModules(m || []); setExams(ex || []); setProgress(pr || []); setUsers(us || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const userName = (uid) => { const u = users.find((x) => x.id === uid); return u?.full_name || u?.email || (uid || "").slice(-6); };

  const openModule = (m) => { setEditing(m || null); setForm({ module_key: m?.module_key || "", title: m?.title || "", description: m?.description || "", content_url: m?.content_url || "", sort_order: m?.sort_order || 0, required_for_roles: m?.required_for_roles || "aliada", active: m?.active ?? true }); setShowForm("module"); };
  const openExam = (ex) => { setEditing(ex || null); setForm({ title: ex?.title || "", questions_json: ex?.questions_json || "[]", passing_score: ex?.passing_score || 70, active: ex?.active ?? true }); setShowForm("exam"); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (showForm === "module") {
        if (editing) await base44.entities.TrainingModule.update(editing.id, form);
        else await base44.entities.TrainingModule.create(form);
      } else {
        if (editing) await base44.entities.TrainingExam.update(editing.id, form);
        else await base44.entities.TrainingExam.create(form);
      }
      setShowForm(false);
      await load();
    } catch (err) { /* ignore */ }
    finally { setSaving(false); }
  };

  const modList = useAdminList({ items: modules, filterFn: (m, s) => (m.title || "").toLowerCase().includes(s.toLowerCase()) });
  const exList = useAdminList({ items: exams, filterFn: (x, s) => (x.title || "").toLowerCase().includes(s.toLowerCase()) });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Capacitación</h1>
        <p className="text-sm text-muted-foreground">Módulos, evaluación, biblioteca y avance de Aliadas.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-semibold border-b-2 -mb-px ${tab === t.key ? "border-revive-green text-revive-dark" : "border-transparent text-muted-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "modulos" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1"><SearchInput value={modList.search} onChange={(v) => { modList.setSearch(v); modList.setPage(1); }} placeholder="Buscar módulo…" /></div>
            <button onClick={() => openModule(null)} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-4 py-2.5 rounded-xl text-sm"><Plus className="w-4 h-4" /> Nuevo</button>
          </div>
          {modList.total === 0 ? <EmptyState icon={BookOpen} title="Sin módulos" hint="Crea el primer módulo de capacitación." /> : (
            <div className="space-y-2">
              {modList.paged.map((m) => (
                <div key={m.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="font-heading font-semibold text-revive-dark truncate">{m.title}</p>{m.active ? <CheckCircle2 className="w-4 h-4 text-revive-green" /> : <span className="text-xs text-muted-foreground">Inactivo</span>}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.module_key} · {m.required_for_roles} · orden {m.sort_order}</p>
                  </div>
                  <button onClick={() => openModule(m)} className="p-2 rounded-lg border border-border text-revive-dark hover:bg-muted/40"><Pencil className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "examenes" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1"><SearchInput value={exList.search} onChange={(v) => { exList.setSearch(v); exList.setPage(1); }} placeholder="Buscar evaluación…" /></div>
            <button onClick={() => openExam(null)} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-4 py-2.5 rounded-xl text-sm"><Plus className="w-4 h-4" /> Nueva</button>
          </div>
          {exList.total === 0 ? <EmptyState icon={GraduationCap} title="Sin evaluaciones" hint="Crea una evaluación con sus preguntas." /> : (
            <div className="space-y-2">
              {exList.paged.map((x) => (
                <div key={x.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="font-heading font-semibold text-revive-dark truncate">{x.title}</p>{x.active ? <CheckCircle2 className="w-4 h-4 text-revive-green" /> : <span className="text-xs text-muted-foreground">Inactiva</span>}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Aprobación mínima: {x.passing_score}%</p>
                  </div>
                  <button onClick={() => openExam(x)} className="p-2 rounded-lg border border-border text-revive-dark hover:bg-muted/40"><Pencil className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "avance" && (
        <div className="space-y-2">
          {progress.length === 0 ? <EmptyState icon={BarChart3} title="Sin avance registrado" hint="Las Aliadas verán aquí su progreso por módulo." /> : (
            progress.map((p) => (
              <div key={p.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div><p className="font-heading font-semibold text-revive-dark">{userName(p.user_id)}</p><p className="text-xs text-muted-foreground">{p.module_key} · {p.status}</p></div>
                {p.score != null && <span className="text-sm font-heading font-bold text-revive-dark">{p.score}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-revive-dark">{editing ? "Editar" : "Nuevo"} {showForm === "module" ? "módulo" : "evaluación"}</h2>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {showForm === "module" ? (
              <>
                <input required placeholder="Clave (module_key)" value={form.module_key} onChange={(e) => setForm({ ...form, module_key: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
                <input required placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
                <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm resize-none" />
                <input placeholder="URL de contenido / video" value={form.content_url} onChange={(e) => setForm({ ...form, content_url: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Orden" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
                  <input placeholder="Roles (csv)" value={form.required_for_roles} onChange={(e) => setForm({ ...form, required_for_roles: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activo</label>
              </>
            ) : (
              <>
                <input required placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
                <textarea placeholder='Preguntas JSON: [{"question":"…","options":["a","b"],"correct_index":0}]' value={form.questions_json} onChange={(e) => setForm({ ...form, questions_json: e.target.value })} rows={5} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm font-mono resize-none" />
                <input type="number" placeholder="% aprobación" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activa</label>
              </>
            )}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}