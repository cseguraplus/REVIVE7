import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Star, Check, X, Clock, Pause, Play, Pencil, Plus, Trash2, Save } from "lucide-react";

const APP_STATES = ["submitted", "under_review", "approved", "rejected", "waitlist"];
const PROFILE_STATES = ["pending_training", "active", "suspended", "inactive"];
const MODULE_KEYS = ["revive7_intro", "intensities", "clients_sales"];

const stateBadge = (s) => {
  const map = {
    submitted: "bg-blue-100 text-blue-700", under_review: "bg-amber-100 text-amber-700",
    approved: "bg-revive-green-pale text-revive-dark", rejected: "bg-red-100 text-red-700", waitlist: "bg-gray-100 text-gray-600",
    pending_training: "bg-amber-100 text-amber-700", active: "bg-revive-green-pale text-revive-dark",
    suspended: "bg-red-100 text-red-700", inactive: "bg-gray-100 text-gray-600",
  };
  return map[s] || "bg-gray-100 text-gray-600";
};

export default function AdminAliadas() {
  const [tab, setTab] = useState("postulaciones");
  const [solicitudes, setSolicitudes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const load = async () => {
    const [sols, profs, exams] = await Promise.all([
      base44.entities.SolicitudAliada.list("-created_date", 200),
      base44.entities.AliadaProfile.list("-created_date", 200),
      base44.entities.TrainingExam.filter({ active: true }),
    ]);
    setSolicitudes(sols || []);
    setProfiles(profs || []);
    setExam((exams && exams[0]) || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const run = async (fn, payload, label) => {
    setBusy(true); setNote(null);
    try { await base44.functions.invoke(fn, payload); setNote(label); await load(); }
    catch (e) { setNote(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  const filteredSols = solicitudes.filter((s) => filter === "all" || s.estado === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Aliadas</h1>
        <p className="text-muted-foreground text-sm mt-1">Postulaciones, perfiles, capacitación y evaluación</p>
      </div>

      {note && <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 text-sm text-revive-dark">{note}</div>}

      <div className="flex gap-2">
        {[["postulaciones", "Postulaciones"], ["aliadas", "Aliadas"], ["evaluacion", "Evaluación"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-heading font-bold ${tab === k ? "bg-revive-dark text-white" : "bg-white border border-border text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "postulaciones" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold ${filter === "all" ? "bg-revive-dark text-white" : "bg-white border border-border"}`}>Todas</button>
            {APP_STATES.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold capitalize ${filter === s ? "bg-revive-dark text-white" : "bg-white border border-border"}`}>{s.replace("_", " ")}</button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-revive-cream text-left text-revive-dark">
                <tr><th className="px-4 py-3 font-heading font-bold">Nombre</th><th className="px-4 py-3 font-heading font-bold">Email</th><th className="px-4 py-3 font-heading font-bold">Ciudad</th><th className="px-4 py-3 font-heading font-bold">Estado</th><th className="px-4 py-3 font-heading font-bold text-right">Acciones</th></tr>
              </thead>
              <tbody>
                {filteredSols.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Sin postulaciones.</td></tr>}
                {filteredSols.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-revive-cream/40">
                    <td className="px-4 py-3 font-heading font-bold text-revive-dark">{s.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.ciudad || "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-heading font-bold px-2 py-1 rounded-full capitalize ${stateBadge(s.estado)}`}>{s.estado.replace("_", " ")}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setSelected(s)} className="text-muted-foreground hover:text-revive-dark" title="Ficha"><Pencil className="w-4 h-4" /></button>
                        {s.estado !== "approved" && (
                          <button onClick={() => run("approveAliadaApplication", { solicitud_id: s.id }, "Aprobada")} disabled={busy} className="px-2 py-1 rounded bg-revive-green text-revive-dark text-xs font-heading font-bold">Aprobar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "aliadas" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-revive-cream text-left text-revive-dark">
              <tr><th className="px-4 py-3 font-heading font-bold">Nombre</th><th className="px-4 py-3 font-heading font-bold">Código</th><th className="px-4 py-3 font-heading font-bold">Capacitación</th><th className="px-4 py-3 font-heading font-bold">Estado</th><th className="px-4 py-3 font-heading font-bold text-right">Acciones</th></tr>
            </thead>
            <tbody>
              {profiles.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Sin aliadas.</td></tr>}
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-revive-cream/40">
                  <td className="px-4 py-3 font-heading font-bold text-revive-dark">{p.public_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.aliada_code}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{(p.training_status || "not_started").replace("_", " ")}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-heading font-bold px-2 py-1 rounded-full ${stateBadge(p.status)}`}>{(p.status || "pending_training").replace("_", " ")}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {p.status !== "active" && <button onClick={() => run("setAliadaProfileStatus", { profile_id: p.id, status: "active" }, "Reactivada")} disabled={busy} className="px-2 py-1 rounded bg-revive-green text-revive-dark text-xs font-heading font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Activar</button>}
                      {p.status === "active" && <button onClick={() => { const r = prompt("Motivo de suspensión:"); if (r) run("setAliadaProfileStatus", { profile_id: p.id, status: "suspended", reason: r }, "Suspendida"); }} disabled={busy} className="px-2 py-1 rounded bg-red-600 text-white text-xs font-heading font-bold flex items-center gap-1"><Pause className="w-3 h-3" /> Suspender</button>}
                      {p.status !== "inactive" && <button onClick={() => run("setAliadaProfileStatus", { profile_id: p.id, status: "inactive" }, "Inactiva")} disabled={busy} className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs font-heading font-bold">Inactivar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "evaluacion" && <ExamEditor exam={exam} onSaved={load} />}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-revive-dark">Ficha · {selected.nombre}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd className="text-revive-dark">{selected.email}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">WhatsApp</dt><dd className="text-revive-dark">{selected.telefono}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Zona</dt><dd className="text-revive-dark">{selected.ciudad || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Ocupación</dt><dd className="text-revive-dark">{selected.ocupacion || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Experiencia</dt><dd className="text-revive-dark text-right max-w-[60%]">{selected.experiencia_venta || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tiempo disponible</dt><dd className="text-revive-dark">{selected.tiempo_disponible || "—"}</dd></div>
              {selected.campaign && <div className="flex justify-between"><dt className="text-muted-foreground">Campaña/UTM</dt><dd className="text-revive-dark text-right text-xs max-w-[60%] break-all">{selected.campaign}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Origen</dt><dd className="text-revive-dark text-xs">{selected.source_domain || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Estado</dt><dd><span className={`text-xs font-heading font-bold px-2 py-1 rounded-full capitalize ${stateBadge(selected.estado)}`}>{selected.estado.replace("_", " ")}</span></dd></div>
            </dl>
            {selected.mensaje && <p className="mt-3 text-sm text-muted-foreground bg-revive-cream rounded-xl p-3"><span className="font-heading font-semibold text-revive-dark">Motivo: </span>{selected.mensaje}</p>}
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={() => { run("approveAliadaApplication", { solicitud_id: selected.id }, "Aprobada"); setSelected(null); }} disabled={busy || selected.estado === "approved"} className="flex items-center justify-center gap-1.5 bg-revive-green text-revive-dark text-sm font-heading font-bold py-2.5 rounded-lg disabled:opacity-50"><Check className="w-4 h-4" /> Aprobar</button>
              <button onClick={() => { run("setAliadaApplicationStatus", { solicitud_id: selected.id, status: "under_review" }, "En revisión"); setSelected(null); }} disabled={busy} className="flex items-center justify-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-heading font-bold py-2.5 rounded-lg"><Clock className="w-4 h-4" /> En revisión</button>
              <button onClick={() => { run("setAliadaApplicationStatus", { solicitud_id: selected.id, status: "waitlist" }, "En espera"); setSelected(null); }} disabled={busy} className="flex items-center justify-center gap-1.5 bg-gray-200 text-gray-700 text-sm font-heading font-bold py-2.5 rounded-lg">Lista de espera</button>
              <button onClick={() => { const r = prompt("Motivo de rechazo:"); if (r) { run("setAliadaApplicationStatus", { solicitud_id: selected.id, status: "rejected", reason: r }, "Rechazada"); setSelected(null); } }} disabled={busy} className="flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-heading font-bold py-2.5 rounded-lg"><X className="w-4 h-4" /> Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamEditor({ exam, onSaved }) {
  const [title, setTitle] = useState(exam?.title || "Evaluación de capacitación");
  const [passing, setPassing] = useState(exam?.passing_score || 70);
  const [questions, setQuestions] = useState(() => {
    if (exam?.questions_json) { try { return JSON.parse(exam.questions_json); } catch (e) {} }
    return [{ question: "", options: ["", "", ""], correct_index: 0 }];
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const update = (i, field, val) => setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  const updateOpt = (i, oi, val) => setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, options: q.options.map((o, oidx) => oidx === oi ? val : o) } : q));
  const addQuestion = () => setQuestions((p) => [...p, { question: "", options: ["", "", ""], correct_index: 0 }]);
  const removeQuestion = (i) => setQuestions((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    const valid = questions.filter((q) => q.question && q.options.filter(Boolean).length >= 2);
    if (valid.length < 5) { setMsg("La evaluación necesita al menos 5 preguntas válidas."); return; }
    if (valid.length > 10) { setMsg("La evaluación permite máximo 10 preguntas."); return; }
    setSaving(true); setMsg(null);
    try {
      const payload = { title, passing_score: passing, questions_json: JSON.stringify(valid), active: true };
      if (exam?.id) await base44.entities.TrainingExam.update(exam.id, payload);
      else await base44.entities.TrainingExam.create(payload);
      setMsg("Evaluación guardada."); onSaved();
    } catch (e) { setMsg(e?.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2"><Star className="w-5 h-5 text-revive-green" /><h2 className="font-heading font-bold text-revive-dark">Evaluación de capacitación</h2></div>
      {msg && <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 text-sm text-revive-dark">{msg}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Título</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">% aprobación</label><input type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(parseInt(e.target.value))} className="w-full border border-input rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <p className="text-xs text-muted-foreground">{questions.length} preguntas (5–10)</p>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
        {questions.map((q, i) => (
          <div key={i} className="border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-heading font-bold text-muted-foreground">P{i + 1}</span>
              <input value={q.question} onChange={(e) => update(i, "question", e.target.value)} placeholder="Pregunta" className="flex-1 border border-input rounded-lg px-2 py-1.5 text-sm" />
              <button onClick={() => removeQuestion(i)}><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${i}`} checked={q.correct_index === oi} onChange={() => update(i, "correct_index", oi)} className="w-3.5 h-3.5 accent-revive-green" />
                  <input value={o} onChange={(e) => updateOpt(i, oi, e.target.value)} placeholder={`Opción ${oi + 1}`} className="flex-1 border border-input rounded-lg px-2 py-1 text-sm" />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={addQuestion} disabled={questions.length >= 10} className="flex items-center gap-1.5 bg-white border border-border text-revive-dark text-sm font-heading font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Plus className="w-4 h-4" /> Agregar pregunta</button>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-revive-dark text-white text-sm font-heading font-bold px-4 py-2 rounded-lg disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar evaluación</button>
      </div>
    </div>
  );
}