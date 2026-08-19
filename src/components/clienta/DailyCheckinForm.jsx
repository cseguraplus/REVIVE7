import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, Lock, Video } from "lucide-react";

const MANUAL_OBJECTIVES = [
  { key: "objective_dailypacks", label: "DailyPacks" },
  { key: "objective_hydration", label: "Hidratación" },
  { key: "objective_nutrition", label: "Alimentación" },
  { key: "objective_movement", label: "Movimiento" },
  { key: "objective_rest", label: "Descanso" },
];

const EMOTIONS = [
  { key: "great", label: "Excelente", emoji: "🌟" },
  { key: "good", label: "Bien", emoji: "🙂" },
  { key: "neutral", label: "Regular", emoji: "😐" },
  { key: "low", label: "Con dificultad", emoji: "💛" },
];

export default function DailyCheckinForm({ clientaId, programDayId, enrollmentId, day, onCompleted }) {
  const initial = day || {};
  const videoCompleted = !!initial.video_completed;
  const [objectives, setObjectives] = useState(() =>
    MANUAL_OBJECTIVES.reduce((o, item) => { o[item.key] = !!(initial.objectives && initial.objectives[item.key]); return o; }, {})
  );
  const [emotional, setEmotional] = useState(initial.emotional_state || null);
  const [comment, setComment] = useState(initial.emotional_comment || "");
  const [share, setShare] = useState(initial.share_with_aliada !== false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(initial.checkin_completed || false);
  const [completed, setCompleted] = useState(initial.checkin_completed || false);
  const [checkinId, setCheckinId] = useState(initial.checkin_id || null);

  const manualDone = MANUAL_OBJECTIVES.every((o) => objectives[o.key]);
  const canClose = videoCompleted && manualDone && emotional && !completed;

  const toggleObjective = (key) => {
    setObjectives((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const buildPayload = () => ({
    clienta_id: clientaId,
    program_day_id: programDayId,
    enrollment_id: enrollmentId || undefined,
    video_completed: videoCompleted,
    objective_video: videoCompleted,
    objective_dailypacks: objectives.objective_dailypacks,
    objective_hydration: objectives.objective_hydration,
    objective_nutrition: objectives.objective_nutrition,
    objective_movement: objectives.objective_movement,
    objective_rest: objectives.objective_rest,
    emotional_state: emotional || undefined,
    emotional_comment: comment.trim() || undefined,
    share_with_aliada: share,
  });

  const saveCheckin = async () => {
    setSaving(true);
    setError(null);
    try {
      if (checkinId) {
        await base44.entities.DailyCheckin.update(checkinId, buildPayload());
      } else {
        const created = await base44.entities.DailyCheckin.create(buildPayload());
        setCheckinId(created.id);
      }
      setSaved(true);
      return true;
    } catch (err) {
      setError(err.message || "No se pudo guardar el check-in.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteDay = async () => {
    setClosing(true);
    setError(null);
    try {
      const savedOk = await saveCheckin();
      if (!savedOk) return;
      const res = await base44.functions.invoke("completeDailyCheckin", { clientaId, programDayId });
      if (res?.data?.completed) {
        setCompleted(true);
        if (onCompleted) onCompleted(res.data);
      } else if (res?.data?.error) {
        setError(res.data.error);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "No se pudo completar el día.";
      setError(msg);
    } finally {
      setClosing(false);
    }
  };

  if (completed) {
    return (
      <div className="bg-revive-green-pale rounded-2xl p-6 text-center ring-1 ring-revive-green/30">
        <CheckCircle2 className="w-12 h-12 text-revive-green mx-auto" />
        <p className="font-heading font-bold text-revive-dark mt-3 text-lg">¡Día completado!</p>
        <p className="text-sm text-revive-dark/70 mt-1">Gracias por cuidarte hoy. Tu siguiente día se está abriendo. 🌿</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-heading font-semibold text-revive-dark mb-2">Mis objetivos del día</p>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium ${videoCompleted ? "bg-revive-green-pale border-revive-green text-revive-dark" : "bg-muted/40 border-border text-muted-foreground"}`}>
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${videoCompleted ? "bg-revive-green border-revive-green" : "border-border"}`}>
              {videoCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-revive-dark" /> : <Video className="w-3 h-3 text-muted-foreground" />}
            </span>
            Ver el video {videoCompleted ? "✓" : "(se completa al ver el video)"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MANUAL_OBJECTIVES.map((o) => {
              const checked = objectives[o.key];
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => toggleObjective(o.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left ${checked ? "bg-revive-green-pale border-revive-green text-revive-dark" : "bg-white border-border text-muted-foreground"}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "bg-revive-green border-revive-green" : "border-border"}`}>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-revive-dark" />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <p className="font-heading font-semibold text-revive-dark mb-2">¿Cómo te sentiste hoy?</p>
        <div className="grid grid-cols-2 gap-2">
          {EMOTIONS.map((e) => {
            const active = emotional === e.key;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => { setEmotional(e.key); setSaved(false); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${active ? "bg-revive-dark text-white border-revive-dark" : "bg-white border-border text-muted-foreground"}`}
              >
                <span>{e.emoji}</span>
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Comentario (opcional)</label>
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          placeholder="¿Algo que quieras recordar de hoy?"
          className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 resize-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input type="checkbox" checked={share} onChange={(e) => { setShare(e.target.checked); setSaved(false); }} className="accent-revive-green w-4 h-4" />
        Compartir cómo me siento con mi aliada
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-col gap-2">
        <button
          onClick={saveCheckin}
          disabled={saving}
          className="w-full px-4 py-2.5 rounded-xl border border-border text-revive-dark font-heading font-semibold hover:bg-white disabled:opacity-50 transition-colors text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : saved ? "Avance guardado ✓" : "Guardar avance"}
        </button>
        <button
          onClick={handleCompleteDay}
          disabled={!canClose || closing}
          className="w-full px-4 py-3 rounded-xl bg-revive-green text-revive-dark font-heading font-bold hover:bg-revive-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{!videoCompleted ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Completar mi día</>}
        </button>
      </div>
      {!videoCompleted && <p className="text-xs text-muted-foreground text-center">Termina de ver el video para habilitar el cierre del día.</p>}
    </div>
  );
}