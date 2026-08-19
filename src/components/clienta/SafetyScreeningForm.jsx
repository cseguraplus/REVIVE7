import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ShieldCheck, AlertTriangle, HeartPulse } from "lucide-react";

const QUESTIONS = [
  { key: "adult", label: "¿Eres mayor de edad?", yesIsRisk: false },
  { key: "pregnancy_nursing", label: "¿Estás embarazada o en lactancia?", yesIsRisk: true },
  { key: "diagnosed", label: "¿Tienes algún diagnóstico de salud declarado?", yesIsRisk: true },
  { key: "medications", label: "¿Tomas medicamentos de prescripción?", yesIsRisk: true },
  { key: "allergies", label: "¿Tienes alergias conocidas?", yesIsRisk: true },
  { key: "medical_supervision", label: "¿Estás bajo supervisión médica?", yesIsRisk: true },
  { key: "supplement_restriction", label: "¿Tienes restricción médica para consumir suplementos?", yesIsRisk: true },
];

export default function SafetyScreeningForm({ existing }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(existing ? { submitted: true } : null);
  const [error, setError] = useState(null);
  const set = (k, v) => setAnswers((p) => ({ ...p, [k]: v }));

  const submitted = result?.submitted;
  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("submitSafetyScreening", { answers });
      setResult({ ...(res?.data || res), submitted: true });
    } catch (err) { setError(err?.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-6">
      <h3 className="font-heading font-bold text-lg text-revive-dark mb-1 flex items-center gap-2">
        <HeartPulse className="w-5 h-5 text-revive-green" /> Cuestionario preventivo
      </h3>
      <p className="text-xs text-muted-foreground mb-4">No sustituye un diagnóstico médico. Tus respuestas son privadas; tu Aliada solo verá si requiere orientación profesional.</p>

      {submitted ? (
        <div className={`rounded-xl p-4 flex items-start gap-2 ${result.safety_flag ? "bg-amber-50 border border-amber-200" : "bg-revive-green-pale border border-revive-green/30"}`}>
          {result.safety_flag ? <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" /> : <ShieldCheck className="w-5 h-5 text-revive-dark mt-0.5" />}
          <div>
            <p className="font-heading font-bold text-revive-dark text-sm">{result.safety_flag ? "Recomendación preventiva" : "Sin precauciones declaradas"}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{result.recommendation}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>}
          {QUESTIONS.map((q) => (
            <div key={q.key} className="border border-border rounded-xl p-3">
              <p className="text-sm font-heading font-semibold text-revive-dark mb-2">{q.label}</p>
              <div className="flex gap-2">
                {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map((o) => (
                  <button type="button" key={o.l} onClick={() => set(q.key, o.v)} className={`flex-1 py-2 rounded-lg text-sm font-heading font-bold border ${answers[q.key] === o.v ? (o.v === q.yesIsRisk ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-revive-green-pale border-revive-green/40 text-revive-dark") : "bg-white border-border text-muted-foreground"}`}>{o.l}</button>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" disabled={busy || !allAnswered} className="w-full flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm py-3 rounded-xl disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Enviar cuestionario
          </button>
        </form>
      )}
    </div>
  );
}