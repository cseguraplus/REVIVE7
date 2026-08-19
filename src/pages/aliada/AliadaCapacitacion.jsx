import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, BookOpen, GraduationCap, Library, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";

const MODULE_KEYS = ["revive7_intro", "intensities", "clients_sales"];
const MODULE_LABELS = {
  revive7_intro: "1. Qué es Revive 7 y cómo funciona",
  intensities: "2. Orientar la elección: Renueva 7, Activa 7, Evoluciona 7",
  clients_sales: "3. Registrar clientas, ventas y seguimiento",
};

export default function AliadaCapacitacion() {
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [exam, setExam] = useState(null);
  const [intensityGuides, setIntensityGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const me = await base44.auth.me();
    const [profs, mods, allProgress, exams, guides] = await Promise.all([
      base44.entities.AliadaProfile.filter({ user_id: me.id }),
      base44.entities.TrainingModule.filter({ active: true }),
      base44.entities.TrainingProgress.filter({ user_id: me.id }),
      base44.entities.TrainingExam.filter({ active: true }),
      base44.entities.IntensityGuide.list("sort_order", 10),
    ]);
    setProfile((profs && profs[0]) || null);
    setModules((mods || []).filter((m) => MODULE_KEYS.includes(m.module_key)).sort((a, b) => MODULE_KEYS.indexOf(a.module_key) - MODULE_KEYS.indexOf(b.module_key)));
    setProgress(allProgress || []);
    setExam((exams && exams[0]) || null);
    setIntensityGuides(guides || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const completedKeys = new Set(progress.filter((p) => p.status === "completed").map((p) => p.module_key));
  const allModules = MODULE_KEYS.every((k) => completedKeys.has(k));
  const guidelinesOk = !!profile?.guidelines_accepted_at;

  const completeModule = async (key) => {
    setBusy(true);
    try { await base44.functions.invoke("completeTrainingModule", { module_key: key }); await load(); }
    catch (e) { setMsg(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  const acceptGuidelines = async () => {
    setBusy(true);
    try { await base44.functions.invoke("acceptTrainingGuidelines", {}); await load(); }
    catch (e) { setMsg(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  const submitExam = async () => {
    setBusy(true); setResult(null);
    try {
      const ordered = examQuestions.map((_, i) => answers[i] ?? -1);
      const res = await base44.functions.invoke("submitTrainingExam", { answers: ordered });
      setResult(res?.data || res);
      if (res?.data?.activated || res?.activated) setMsg("¡Capacitación completada! Tu perfil ahora está activo.");
      await load();
    } catch (e) { setMsg(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  let examQuestions = [];
  if (exam?.questions_json) { try { examQuestions = JSON.parse(exam.questions_json); } catch (e) {} }
  const canTakeExam = allModules && guidelinesOk;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Capacitación</h1>
        <p className="text-muted-foreground text-sm mt-1">Completa los 3 módulos, acepta los lineamientos y aprueba la evaluación para activar tu perfil.</p>
      </div>

      {msg && <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 text-sm text-revive-dark">{msg}</div>}

      {/* Estado */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 grid grid-cols-3 gap-4 text-center">
        <div><p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Módulos</p><p className="font-heading font-bold text-revive-dark mt-1">{completedKeys.size}/3</p></div>
        <div><p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Lineamientos</p><p className="font-heading font-bold mt-1">{guidelinesOk ? <Check className="w-5 h-5 text-revive-green mx-auto" /> : "—"}</p></div>
        <div><p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Perfil</p><p className="font-heading font-bold text-revive-dark mt-1 capitalize">{(profile?.status || "pending_training").replace("_", " ")}</p></div>
      </div>

      {/* Módulos */}
      <div className="space-y-3">
        {MODULE_KEYS.map((key) => {
          const done = completedKeys.has(key);
          const mod = modules.find((m) => m.module_key === key);
          return (
            <div key={key} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading font-bold text-revive-dark flex items-center gap-2">
                    {done ? <Check className="w-4 h-4 text-revive-green" /> : <BookOpen className="w-4 h-4 text-muted-foreground" />}
                    {MODULE_LABELS[key]}
                  </h3>
                  {mod?.description && <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>}
                  {mod?.content_url && <a href={mod.content_url} target="_blank" rel="noreferrer" className="text-xs text-revive-green font-heading font-semibold hover:underline mt-1 inline-block">Abrir material ↗</a>}
                </div>
                <button onClick={() => completeModule(key)} disabled={busy || done} className={`text-sm font-heading font-bold px-4 py-2 rounded-lg ${done ? "bg-revive-green-pale text-revive-dark" : "bg-revive-dark text-white hover:bg-revive-dark-mid"} disabled:opacity-70`}>{done ? "Completado" : "Marcar completado"}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lineamientos */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-revive-green" />
          <div>
            <h3 className="font-heading font-bold text-revive-dark">Lineamientos</h3>
            <p className="text-xs text-muted-foreground">Acepta los lineamientos de la aliada Revive 7.</p>
          </div>
        </div>
        <button onClick={acceptGuidelines} disabled={busy || guidelinesOk} className={`text-sm font-heading font-bold px-4 py-2 rounded-lg ${guidelinesOk ? "bg-revive-green-pale text-revive-dark" : "bg-revive-dark text-white hover:bg-revive-dark-mid"} disabled:opacity-70`}>{guidelinesOk ? "Aceptados" : "Aceptar"}</button>
      </div>

      {/* Evaluación */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-revive-green" /><h3 className="font-heading font-bold text-revive-dark">Evaluación</h3></div>
        {!canTakeExam && <p className="text-sm text-muted-foreground">Completa los 3 módulos y acepta los lineamientos para desbloquear la evaluación.</p>}
        {canTakeExam && !exam && <p className="text-sm text-muted-foreground">No hay evaluación activa todavía. El administrador la configurará pronto.</p>}
        {canTakeExam && exam && (
          <div className="space-y-4">
            {examQuestions.map((q, i) => (
              <div key={i}>
                <p className="text-sm font-heading font-semibold text-revive-dark mb-2">{i + 1}. {q.question}</p>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => (
                    <label key={oi} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${answers[i] === oi ? "border-revive-green bg-revive-green-pale" : "border-border"}`}>
                      <input type="radio" name={`q-${i}`} checked={answers[i] === oi} onChange={() => setAnswers((p) => ({ ...p, [i]: oi }))} className="w-3.5 h-3.5 accent-revive-green" />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={submitExam} disabled={busy || examQuestions.some((_, i) => answers[i] === undefined)} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-5 py-3 rounded-xl hover:bg-revive-dark-mid disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enviar evaluación
            </button>
            {result && (
              <div className={`rounded-xl p-3 text-sm ${result.passed ? "bg-revive-green-pale text-revive-dark" : "bg-red-50 text-red-700"}`}>
                Puntaje: {result.score}% — {result.passed ? "Aprobada" : "No aprobada"}. {result.activated ? "¡Perfil activado!" : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Biblioteca */}
      <Biblioteca guides={intensityGuides} />
    </div>
  );
}

function Biblioteca({ guides }) {
  const [open, setOpen] = useState("intensidades");
  const sections = [
    { key: "intensidades", label: "Guía de intensidades", icon: BookOpen },
    { key: "faq", label: "Preguntas frecuentes", icon: Library },
    { key: "whatsapp", label: "Materiales WhatsApp", icon: Library },
    { key: "copys", label: "Copys", icon: Library },
    { key: "objeciones", label: "Objeciones", icon: Library },
    { key: "politicas", label: "Políticas", icon: Library },
  ];
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4"><Library className="w-5 h-5 text-revive-green" /><h3 className="font-heading font-bold text-revive-dark">Biblioteca</h3></div>
      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.key} className="border border-border rounded-xl overflow-hidden">
            <button onClick={() => setOpen(open === s.key ? null : s.key)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-heading font-semibold text-revive-dark hover:bg-revive-cream/50">
              <span className="flex items-center gap-2"><s.icon className="w-4 h-4 text-muted-foreground" /> {s.label}</span>
              {open === s.key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {open === s.key && (
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                {s.key === "intensidades" && (
                  <div className="space-y-2">
                    {guides.length === 0 && <p>Sin guías configuradas.</p>}
                    {guides.map((g) => (
                      <div key={g.id} className="border border-border rounded-lg p-3">
                        <p className="font-heading font-bold text-revive-dark">{g.name} {g.price ? `· $${g.price} MXN` : ""}</p>
                        {g.description && <p className="mt-1">{g.description}</p>}
                        {g.instructions && <p className="mt-1"><b>Instrucciones:</b> {g.instructions}</p>}
                        {g.daily_packs && <p className="mt-1"><b>DailyPacks:</b> {g.daily_packs}</p>}
                        {g.general_recommendations && <p className="mt-1"><b>Recomendaciones:</b> {g.general_recommendations}</p>}
                        {g.preventive_notices && <p className="mt-1"><b>Avisos preventivos:</b> {g.preventive_notices}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {s.key === "faq" && <p>Aquí aparecerán las preguntas frecuentes. (Editable por contenidos.)</p>}
                {s.key === "whatsapp" && <p>Materiales y plantillas de WhatsApp para acompañar a tus clientas.</p>}
                {s.key === "copys" && <p>Copys listos para compartir en redes y mensajería.</p>}
                {s.key === "objeciones" && <p>Guion de manejo de objeciones comunes.</p>}
                {s.key === "politicas" && <p>Políticas internas de la aliada Revive 7.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}