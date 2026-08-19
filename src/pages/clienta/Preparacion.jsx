import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, MessageCircle, Sparkles, Target, Calendar, Heart } from "lucide-react";
import VideoPlaceholder from "@/components/clienta/VideoPlaceholder";
import PrepCountdown from "@/components/clienta/PrepCountdown";
import PrepChecklist from "@/components/clienta/PrepChecklist";
import InitialMetricsForm from "@/components/clienta/InitialMetricsForm";
import SafetyScreeningForm from "@/components/clienta/SafetyScreeningForm";

const INTENSITY_LABELS = {
  renueva_7: "Renueva 7",
  activa_7: "Activa 7",
  evoluciona_7: "Evoluciona 7",
};

const CHECKLIST_ITEMS = [
  { id: "video_welcome", label: "Vi el video de bienvenida" },
  { id: "kit_ready", label: "Tengo mi kit de productos" },
  { id: "reminders", label: "Configuré mis recordatorios diarios" },
  { id: "goal_set", label: "Definí mi objetivo personal" },
  { id: "method_understood", label: "Comprendo el método de 13 semanas" },
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function AliadaWhatsAppButton({ aliada, label = "WhatsApp de mi Aliada" }) {
  if (!aliada?.whatsapp) return null;
  const phone = aliada.whatsapp.replace(/[^\d]/g, "");
  const msg = encodeURIComponent("¡Hola! Soy clienta de Revive 7 y quiero iniciar mi preparación.");
  return (
    <a
      href={`https://wa.me/${phone}?text=${msg}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 bg-[#25D366] text-white font-heading font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity"
    >
      <MessageCircle className="w-5 h-5" /> {label}
    </a>
  );
}

export default function Preparacion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [generation, setGeneration] = useState(null);
  const [aliada, setAliada] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [goal, setGoal] = useState("");
  const [initialMetrics, setInitialMetrics] = useState(null);
  const [weeklyCycles, setWeeklyCycles] = useState([]);
  const [weeklyCycle, setWeeklyCycle] = useState(null);
  const [intensityGuides, setIntensityGuides] = useState([]);
  const [intensityChoice, setIntensityChoice] = useState("");
  const [screening, setScreening] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        const profiles = await base44.entities.ClientaProfile.filter({ user_id: user.id });
        const prof = profiles[0];
        setProfile(prof);
        if (!prof) return;
        try { setChecklist(JSON.parse(prof.prep_checklist_json || "[]")); } catch { /* noop */ }
        setGoal(prof.start_goal || "");
        if (prof.aliada_id) {
          try {
            const res = await base44.functions.invoke('getMyAliadaContact', {});
            setAliada(res?.data?.aliada || null);
          } catch { /* noop */ }
        }
        const enrollments = await base44.entities.Enrollment.filter({ clienta_id: user.id, status: "active" });
        const enr = enrollments[0];
        setEnrollment(enr);
        if (enr) {
          try { setGeneration(await base44.entities.Generation.get(enr.generation_id)); } catch { /* noop */ }
        }
        const metrics = await base44.entities.WeeklyMetrics.filter({ clienta_id: user.id, capture_type: "initial" });
        if (metrics[0]) setInitialMetrics(metrics[0]);
        const [cycles, guides, screenings] = await Promise.all([
          base44.entities.WeeklyCycle.filter({ clienta_id: user.id }),
          base44.entities.IntensityGuide.list("sort_order", 10),
          base44.entities.SafetyScreening.filter({ clienta_id: user.id }),
        ]);
        const sortedCycles = (cycles || []).sort((a, b) => (a.week_number || 0) - (b.week_number || 0));
        setWeeklyCycles(sortedCycles);
        const nextCycle = sortedCycles.find((c) => c.status === "active" || c.status === "pending") || sortedCycles[0] || null;
        setWeeklyCycle(nextCycle);
        setIntensityGuides(guides || []);
        setScreening((screenings && screenings[0]) || null);
        setIntensityChoice(prof?.intensity_choice || nextCycle?.intensity || "");
      } catch (err) {
        setError(err.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleChecklist = async (id) => {
    const next = checklist.includes(id) ? checklist.filter((x) => x !== id) : [...checklist, id];
    setChecklist(next);
    await base44.entities.ClientaProfile.update(profile.id, { prep_checklist_json: JSON.stringify(next) });
  };

  const saveGoal = async () => {
    if (!profile) return;
    await base44.entities.ClientaProfile.update(profile.id, { start_goal: goal });
  };

  const saveIntensity = async (val) => {
    setIntensityChoice(val);
    if (profile) await base44.entities.ClientaProfile.update(profile.id, { intensity_choice: val });
  };

  const saveMetrics = async (values) => {
    if (initialMetrics) {
      const updated = await base44.entities.WeeklyMetrics.update(initialMetrics.id, values);
      setInitialMetrics(updated);
    } else {
      const payload = { clienta_id: me.id, capture_type: "initial", ...values, ...(enrollment && { enrollment_id: enrollment.id }) };
      const created = await base44.entities.WeeklyMetrics.create(payload);
      setInitialMetrics(created);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3 max-w-2xl">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const firstName = me?.full_name ? me.full_name.split(" ")[0] : "";

  // Empty state: no profile yet
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Bienvenida a Mi Revive 7{firstName ? `, ${firstName}` : ""}</h1>
        <div className="bg-white border border-border rounded-2xl p-10 text-center">
          <Sparkles className="w-12 h-12 text-revive-green mx-auto mb-4" />
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-2">Tu cuenta está lista</h2>
          <p className="text-muted-foreground">Tu Aliada te está esperando. Pronto se asignará a tu cuenta para comenzar tu preparación.</p>
        </div>
      </div>
    );
  }

  // Empty state: no active enrollment
  if (!enrollment || !generation) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Bienvenida a Mi Revive 7{firstName ? `, ${firstName}` : ""}</h1>
        <div className="bg-white border border-border rounded-2xl p-10 text-center">
          <Calendar className="w-12 h-12 text-revive-green mx-auto mb-4" />
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-2">Aún no estás inscrita en una generación</h2>
          <p className="text-muted-foreground mb-6">Contacta a tu Aliada para inscribirte y comenzar tu transformación de 13 semanas.</p>
          <AliadaWhatsAppButton aliada={aliada} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Bienvenida a Mi Revive 7{firstName ? `, ${firstName}` : ""}</h1>
        <p className="text-muted-foreground">Prepárate para tu transformación de 13 semanas.</p>
      </div>

      {/* Aliada + intensity */}
      <div className="bg-white border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Tu Aliada</p>
          <p className="font-heading font-bold text-lg text-revive-dark">{aliada?.public_name || "Tu Aliada"}</p>
          <p className="text-sm text-muted-foreground">
            Intensidad: <span className="font-semibold text-revive-dark">{INTENSITY_LABELS[enrollment.intensity] || enrollment.intensity}</span>
          </p>
        </div>
        <AliadaWhatsAppButton aliada={aliada} label="Contactar a mi Aliada" />
      </div>

      {/* Intensity choice + DailyPacks */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg text-revive-dark mb-3">Intensidad para la próxima semana</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(INTENSITY_LABELS).map(([k, l]) => (
            <button key={k} onClick={() => saveIntensity(k)} className={`py-2.5 rounded-lg text-sm font-heading font-bold border ${intensityChoice === k ? "bg-revive-green-pale border-revive-green/40 text-revive-dark" : "bg-white border-border text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {(() => {
          const guide = intensityGuides.find((g) => g.intensity === intensityChoice);
          if (!guide) return <p className="text-sm text-muted-foreground">Elige una intensidad para ver la guía de DailyPacks.</p>;
          return (
            <div className="space-y-2 text-sm">
              {guide.daily_packs && <p><b className="text-revive-dark">Guía DailyPacks:</b> <span className="text-muted-foreground">{guide.daily_packs}</span></p>}
              {guide.general_recommendations && <p><b className="text-revive-dark">Recomendaciones:</b> <span className="text-muted-foreground">{guide.general_recommendations}</span></p>}
              {guide.preventive_notices && <p className="text-amber-700"><b>Avisos preventivos:</b> {guide.preventive_notices}</p>}
            </div>
          );
        })()}
      </div>

      {/* Welcome video */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg text-revive-dark mb-4">Video de Bienvenida</h3>
        <VideoPlaceholder />
      </div>

      {/* Countdown / WeeklyCycle empty state */}
      {weeklyCycle ? (
        <div className="bg-revive-dark text-white rounded-2xl p-6 text-center">
          <p className="text-sm text-white/70 mb-1">Tu ciclo semanal {weeklyCycle.week_number} inicia el</p>
          <p className="font-heading font-bold text-xl text-revive-green-light mb-4 capitalize">{formatDate(weeklyCycle.unlock_start_date || generation.start_date)}</p>
          <PrepCountdown startDate={weeklyCycle.unlock_start_date || generation.start_date} />
        </div>
      ) : (
        <div className="bg-white border border-dashed border-border rounded-2xl p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-bold text-revive-dark mb-1">Aún no hay WeeklyCycle programado</h3>
          <p className="text-sm text-muted-foreground mb-5">Tu Aliada o el equipo de Operaciones programarán tu primer ciclo semanal. Mientras tanto, completa tu preparación.</p>
          <AliadaWhatsAppButton aliada={aliada} />
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg text-revive-dark mb-4">Checklist de preparación</h3>
        <PrepChecklist items={CHECKLIST_ITEMS} checked={checklist} onToggle={toggleChecklist} />
      </div>

      {/* Personal goal */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg text-revive-dark mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-revive-green" /> Tu objetivo personal
        </h3>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={saveGoal}
          rows={3}
          placeholder="¿Qué quieres lograr en estas 13 semanas?"
          className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30"
        />
      </div>

      {/* Initial metrics */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg text-revive-dark mb-2 flex items-center gap-2">
          <Heart className="w-5 h-5 text-revive-green" /> Indicadores iniciales (opcional)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Registra tu punto de partida para medir tu progreso a lo largo del programa.</p>
        <InitialMetricsForm initial={initialMetrics || {}} onSave={saveMetrics} />
      </div>

      {/* Preventive screening */}
      <SafetyScreeningForm existing={screening} />
    </div>
  );
}