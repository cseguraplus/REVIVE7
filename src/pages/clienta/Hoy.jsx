import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, FlaskConical, Sparkles } from "lucide-react";
import VimeoTrackedPlayer from "@/components/vimeo/VimeoTrackedPlayer";
import DailyAccessBadge from "@/components/clienta/DailyAccessBadge";
import DailyCheckinForm from "@/components/clienta/DailyCheckinForm";
import { parseVimeoUrl, vimeoEmbedUrl } from "@/lib/vimeo";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

export default function Hoy() {
  const [clientaId, setClientaId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (id) => {
    try {
      const res = await base44.functions.invoke("getDailyAccess", { clientaId: id });
      setData(res?.data || null);
      setError(null);
    } catch (err) {
      setError(err.message || "No se pudo cargar tu día.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setClientaId(me.id);
        await load(me.id);
      } catch (err) {
        setError(err.message || "Debes iniciar sesión.");
        setLoading(false);
      }
    })();
  }, [load]);

  const handleCompleted = useCallback(() => {
    if (clientaId) load(clientaId);
  }, [clientaId, load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-semibold text-red-800">No se pudo cargar tu día</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.enrollment_id) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-revive-green mx-auto" />
        <h2 className="font-heading font-bold text-xl text-revive-dark">Tu viaje está por comenzar</h2>
        <p className="text-sm text-muted-foreground">Aún no tienes un programa activo. Completa tu preparación para empezar.</p>
        <Link to="/preparacion" className="inline-flex px-5 py-2.5 rounded-xl bg-revive-green text-revive-dark font-heading font-bold text-sm">Ir a preparación</Link>
      </div>
    );
  }

  const day = data?.day;
  const nextDay = data?.next_day;
  const parsed = parseVimeoUrl(day?.vimeo_url || day?.vimeo_video_id || "");
  const vimeoUrl = vimeoEmbedUrl(parsed.video_id, parsed.privacy_hash || day?.vimeo_privacy_hash);
  const playableStatus = ["welcome", "available", "in_progress", "completed"].includes(day?.status);
  const showPlayer = !!day?.program_day_id && playableStatus;
  const showCheckin = clientaId && day?.program_day_id && ["available", "in_progress"].includes(day?.status);
  const completedDays = data.completed_days || 0;
  const avance = Math.min(100, Math.round((completedDays / 90) * 100));
  const isConsolida = data.is_consolida || (day?.day_number >= 85);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide">{data.generation_name || "Generación"}</p>
            <h1 className="font-heading font-bold text-2xl text-revive-dark leading-tight">
              {isConsolida ? "Consolida 6" : `Día ${day?.day_number ?? ""}`}
            </h1>
            {data.current_intensity && (
              <span className="inline-block mt-1 text-xs font-heading font-bold text-revive-green bg-revive-green-pale px-2.5 py-1 rounded-full">
                {INTENSITY_LABEL[data.current_intensity] || data.current_intensity}
              </span>
            )}
          </div>
          {data?.using_simulated && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
              <FlaskConical className="w-3.5 h-3.5" /> Prueba
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground font-heading font-semibold">Avance de 90 días</span>
            <span className="text-xs font-heading font-bold text-revive-dark">{completedDays}/90 · {avance}%</span>
          </div>
          <div className="bg-revive-cream rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-revive-green rounded-full transition-all" style={{ width: `${Math.max(2, avance)}%` }} />
          </div>
        </div>
      </div>

      <DailyAccessBadge status={day?.status} availableFrom={day?.available_from} />

      {showPlayer && (
        <VimeoTrackedPlayer
          programDayId={day.program_day_id}
          vimeoVideoId={parsed.video_id}
          vimeoUrl={vimeoUrl}
          enrollmentId={data?.enrollment_id}
          weeklyCycleId={data?.current_weekly_cycle_id}
          clientaId={clientaId}
          requiredPercent={day.required_percent || 80}
        />
      )}

      {day?.summary && <p className="text-sm text-muted-foreground leading-relaxed">{day.summary}</p>}

      {showCheckin && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <DailyCheckinForm
            clientaId={clientaId}
            programDayId={day.program_day_id}
            enrollmentId={data?.enrollment_id}
            day={day}
            onCompleted={handleCompleted}
          />
        </div>
      )}

      {day?.status === "completed" && nextDay && (
        <div className="space-y-2">
          <p className="font-heading font-semibold text-revive-dark text-sm">Tu siguiente día</p>
          <div className="bg-white border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-heading font-semibold text-revive-dark text-sm">{nextDay.title || `Día ${nextDay.day_number}`}</p>
              <p className="text-xs text-muted-foreground">
                {nextDay.status === "available" ? "Listo para comenzar" : nextDay.status === "locked_date" ? "Se abre pronto" : nextDay.status === "locked_previous" ? "Completa tu día anterior" : nextDay.status}
              </p>
            </div>
            <DailyAccessBadge status={nextDay.status} compact />
          </div>
        </div>
      )}
    </div>
  );
}