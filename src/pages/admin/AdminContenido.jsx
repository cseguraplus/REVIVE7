import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parseVimeoUrl } from "@/lib/vimeo";
import VimeoPreview from "@/components/admin/VimeoPreview";
import { Plus, Pencil, X, Loader2, Search, Film, Settings2, Play } from "lucide-react";

const WEEKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const STATUSES = ["draft", "published", "archived"];
const DAYS_OF_WEEK = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const SETUP_DAYS = [0, 1, 2];

const weekLabel = (w) => (w === 0 ? "Bienvenida" : w === 13 ? "Consolida 6" : `Semana ${w}`);

export default function AdminContenido() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekFilter, setWeekFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [setupLinks, setSetupLinks] = useState({ 0: "", 1: "", 2: "" });
  const [setupSaving, setSetupSaving] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  const load = async () => {
    const d = await base44.entities.ProgramDay.list("day_number", 200);
    setDays(d || []);
    setLoading(false);
    const map = { 0: "", 1: "", 2: "" };
    (d || []).forEach((day) => { if ([0, 1, 2].includes(day.day_number)) map[day.day_number] = day.vimeo_url || ""; });
    setSetupLinks(map);
  };
  useEffect(() => { load(); }, []);

  const filtered = days
    .filter((d) => weekFilter === "all" || String(d.week_number) === weekFilter)
    .filter((d) => statusFilter === "all" || d.publish_status === statusFilter)
    .filter((d) => !q || (d.title || "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.day_number - b.day_number);

  const openNew = () => {
    setEdit({ isNew: true });
    setForm({ day_number: days.length, week_number: 1, day_of_week: "lunes", day_type: "daily", title: "", summary: "", vimeo_url: "", vimeo_video_id: "", vimeo_privacy_hash: "", required_percent: 80, publish_status: "draft" });
  };
  const openEdit = (d) => { setEdit({ isNew: false }); setForm({ ...d }); };

  const onVimeoChange = (val) => {
    const { video_id, privacy_hash } = parseVimeoUrl(val);
    setForm((p) => ({ ...p, vimeo_url: val, vimeo_video_id: video_id, vimeo_privacy_hash: privacy_hash }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (edit.isNew) await base44.entities.ProgramDay.create(form);
      else await base44.entities.ProgramDay.update(form.id, form);
      setEdit(null); setForm(null); await load();
    } finally { setSaving(false); }
  };

  const saveSetup = async (dayNum) => {
    const item = days.find((d) => d.day_number === dayNum);
    if (!item) return;
    setSetupSaving(true);
    try {
      const { video_id, privacy_hash } = parseVimeoUrl(setupLinks[dayNum]);
      await base44.entities.ProgramDay.update(item.id, {
        vimeo_url: setupLinks[dayNum],
        vimeo_video_id: video_id,
        vimeo_privacy_hash: privacy_hash,
      });
      await load();
      setPreviewId(item.id);
    } finally { setSetupSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;
  }

  const previewDay = previewId ? days.find((d) => d.id === previewId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Contenido · ProgramDay</h1>
        <p className="text-muted-foreground text-sm mt-1">{days.length} días · motor escalable a 90 días · días draft no visibles para clientas</p>
      </div>

      {/* Configuración inicial */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-revive-green" />
          <h2 className="font-heading font-bold text-revive-dark">Configuración inicial</h2>
          <span className="text-xs text-muted-foreground">Pega los enlaces completos de Vimeo y prueba la reproducción</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SETUP_DAYS.map((dn) => {
            const day = days.find((d) => d.day_number === dn);
            return (
              <div key={dn} className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-revive-green text-revive-dark text-xs font-heading font-black px-2.5 py-1 rounded-full">Día {dn}</span>
                  <span className="text-xs text-muted-foreground">{day ? day.title : "—"}</span>
                </div>
                <input
                  type="url"
                  value={setupLinks[dn]}
                  onChange={(e) => setSetupLinks((p) => ({ ...p, [dn]: e.target.value }))}
                  placeholder="https://vimeo.com/..."
                  className="w-full border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-revive-green/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveSetup(dn)}
                    disabled={setupSaving || !setupLinks[dn]}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-revive-dark text-white text-xs font-heading font-bold py-2 rounded-lg hover:bg-revive-dark-mid disabled:opacity-50"
                  >
                    {setupSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Guardar y probar
                  </button>
                </div>
                {day?.vimeo_video_id && (
                  <div className="text-[10px] text-muted-foreground font-mono break-all">
                    id: {day.vimeo_video_id}{day.vimeo_privacy_hash ? ` · h: ${day.vimeo_privacy_hash}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {previewDay && (
          <div className="mt-5 max-w-md">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase mb-2">Vista previa · Día {previewDay.day_number}</p>
            <VimeoPreview video_id={previewDay.vimeo_video_id} privacy_hash={previewDay.vimeo_privacy_hash} />
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título..."
            className="pl-9 border border-input rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-revive-green/30"
          />
        </div>
        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-revive-green/30">
          <option value="all">Todas las semanas</option>
          {WEEKS.map((w) => <option key={w} value={String(w)}>{weekLabel(w)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-revive-green/30">
          <option value="all">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={openNew} className="ml-auto flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2 rounded-lg hover:bg-revive-green-light">
          <Plus className="w-4 h-4" /> Nuevo día
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-revive-cream text-revive-dark">
              <tr className="text-left">
                <th className="px-4 py-3 font-heading font-bold">Día</th>
                <th className="px-4 py-3 font-heading font-bold">Semana</th>
                <th className="px-4 py-3 font-heading font-bold">Día sem.</th>
                <th className="px-4 py-3 font-heading font-bold">Título</th>
                <th className="px-4 py-3 font-heading font-bold">Vimeo</th>
                <th className="px-4 py-3 font-heading font-bold">Estado</th>
                <th className="px-4 py-3 font-heading font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Sin días que coincidan con el filtro.</td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-revive-cream/40">
                  <td className="px-4 py-3 font-heading font-bold text-revive-dark">{d.day_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{weekLabel(d.week_number)}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{d.day_of_week || "—"}</td>
                  <td className="px-4 py-3 text-revive-dark">{d.title}</td>
                  <td className="px-4 py-3">
                    {d.vimeo_video_id
                      ? <span className="inline-flex items-center gap-1 text-revive-green font-heading font-semibold text-xs"><Film className="w-3 h-3" /> Sí</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-heading font-bold px-2 py-1 rounded-full ${
                      d.publish_status === "published" ? "bg-revive-green-pale text-revive-dark"
                      : d.publish_status === "draft" ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"}`}>{d.publish_status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {d.vimeo_video_id && (
                        <button onClick={() => setPreviewId(d.id)} className="text-muted-foreground hover:text-revive-green" title="Vista previa">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(d)} className="text-muted-foreground hover:text-revive-dark" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista previa flotante */}
      {previewDay && (
        <div className="fixed bottom-6 right-6 w-80 z-40 bg-white rounded-2xl border border-border shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-bold text-revive-dark">Día {previewDay.day_number}</span>
            <button onClick={() => setPreviewId(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <VimeoPreview video_id={previewDay.vimeo_video_id} privacy_hash={previewDay.vimeo_privacy_hash} />
        </div>
      )}

      {/* Editor */}
      {edit && form && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setEdit(null); setForm(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-revive-dark">{edit.isNew ? "Nuevo día" : "Editar día"} · Día {form.day_number}</h2>
              <button onClick={() => { setEdit(null); setForm(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">N° día (0-90)</label>
                  <input type="number" min={0} max={90} required value={form.day_number}
                    onChange={(e) => setForm((p) => ({ ...p, day_number: parseInt(e.target.value) }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Semana (0-13)</label>
                  <input type="number" min={0} max={13} required value={form.week_number}
                    onChange={(e) => setForm((p) => ({ ...p, week_number: parseInt(e.target.value) }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Día de la semana</label>
                  <select value={form.day_of_week || ""} onChange={(e) => setForm((p) => ({ ...p, day_of_week: e.target.value || null }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-revive-green/30">
                    <option value="">—</option>
                    {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Tipo</label>
                  <select value={form.day_type} onChange={(e) => setForm((p) => ({ ...p, day_type: e.target.value }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-revive-green/30">
                    {["standard", "rest", "checkpoint", "intro", "welcome", "daily", "consolida"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Estado</label>
                  <select value={form.publish_status} onChange={(e) => setForm((p) => ({ ...p, publish_status: e.target.value }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-revive-green/30">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Título</label>
                <input type="text" required value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Resumen</label>
                <textarea rows={2} value={form.summary || ""} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Enlace completo de Vimeo</label>
                <input type="url" value={form.vimeo_url || ""} onChange={(e) => onVimeoChange(e.target.value)} placeholder="https://vimeo.com/123456789/abc123"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground font-mono">
                  <span>id: {form.vimeo_video_id || "—"}</span>
                  <span>h: {form.vimeo_privacy_hash || "—"}</span>
                </div>
              </div>
              {form.vimeo_video_id && (
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Vista previa</label>
                  <VimeoPreview video_id={form.vimeo_video_id} privacy_hash={form.vimeo_privacy_hash} />
                </div>
              )}
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">% requerido de visualización</label>
                <input type="number" min={0} max={100} value={form.required_percent}
                  onChange={(e) => setForm((p) => ({ ...p, required_percent: parseInt(e.target.value) }))}
                  className="w-32 border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setEdit(null); setForm(null); }} className="px-4 py-2 text-sm font-heading font-semibold text-muted-foreground">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-revive-dark-mid disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}