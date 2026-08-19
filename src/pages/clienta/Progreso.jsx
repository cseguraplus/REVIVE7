import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Lock, CheckCircle2, Flame, Zap } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };
const INTENSITY_COLOR = { renueva_7: "bg-revive-green", activa_7: "bg-revive-dark", evoluciona_7: "bg-amber-500" };

export default function Progreso() {
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) return;
    try {
      const [accessRes, done, programDays] = await Promise.all([
        base44.functions.invoke("getDailyAccess", { clientaId: me.id }),
        base44.entities.DailyCheckin.filter({ clienta_id: me.id, completed: true }),
        base44.entities.ProgramDay.list(),
      ]);
      setData(accessRes?.data || null);
      setCheckins(done || []);
      setDays(programDays || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [me]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;
  if (!data?.enrollment_id) {
    return <div className="bg-white rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">Aún no tienes un programa activo.</div>;
  }

  const completedDays = data.completed_days || 0;
  const currentWeek = data.current_week || 1;
  const intensityHistory = data.intensity_history || [];
  const startDay = data.start_date ? 1 : 0;
  const dayMap = Object.fromEntries(days.map((d) => [d.id, d]));
  const completedByDay = {};
  checkins.forEach((c) => { completedByDay[c.program_day_id] = c; });

  // 90-day grid
  const grid = Array.from({ length: 90 }, (_, i) => {
    const dn = i + 1;
    const pd = days.find((d) => d.day_number === dn);
    const ck = pd ? completedByDay[pd.id] : null;
    return { dn, completed: !!ck, hasContent: !!pd };
  });

  const previousContent = checkins
    .map((c) => ({ checkin: c, day: dayMap[c.program_day_id] }))
    .filter((x) => x.day)
    .sort((a, b) => (b.day.day_number || 0) - (a.day.day_number || 0))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi progreso</h1>
        <p className="text-sm text-muted-foreground">90 días de transformación Revive 7</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-border p-4 text-center">
          <p className="font-heading font-extrabold text-3xl text-revive-green">{completedDays}</p>
          <p className="text-[10px] text-muted-foreground font-heading font-semibold uppercase mt-1">Completados</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 text-center">
          <p className="font-heading font-extrabold text-3xl text-revive-dark">{currentWeek}</p>
          <p className="text-[10px] text-muted-foreground font-heading font-semibold uppercase mt-1">Semana actual</p>
        </div>
        <div className="bg-revive-dark rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-5 h-5 text-revive-green" />
            <p className="font-heading font-extrabold text-3xl text-white">{completedDays}</p>
          </div>
          <p className="text-[10px] text-white/60 font-heading font-semibold uppercase mt-1">Días seguidos</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-revive-dark text-sm">Camino de 90 días</h2>
          <span className="font-heading font-bold text-revive-green text-sm">{Math.round((completedDays / 90) * 100)}%</span>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {grid.map((g) => (
            <div key={g.dn} title={g.dn >= 85 ? `Consolida 6 · Día ${g.dn}` : `Día ${g.dn}`}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-heading font-bold ${
                g.completed ? "bg-revive-green text-white" : g.dn >= 85 ? "bg-amber-50 text-amber-700 border border-amber-200" : g.hasContent ? "bg-revive-cream text-revive-dark/50 border border-revive-green/20" : "bg-muted text-muted-foreground/40"
              }`}>
              {g.dn}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-revive-green rounded-sm" /> Completado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-50 border border-amber-200 rounded-sm" /> Consolida 6</span>
        </div>
      </div>

      {intensityHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-heading font-bold text-revive-dark text-sm mb-3">Historial de intensidades</h2>
          <div className="flex flex-wrap gap-2">
            {intensityHistory.map((h) => (
              <div key={h.week_number} className="flex items-center gap-2 bg-revive-cream rounded-lg px-3 py-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${INTENSITY_COLOR[h.intensity] || "bg-muted"}`} />
                <span className="text-xs font-heading font-semibold text-revive-dark">Sem {h.week_number}</span>
                <span className="text-xs text-muted-foreground">{INTENSITY_LABEL[h.intensity] || h.intensity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previousContent.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h2 className="font-heading font-bold text-revive-dark text-sm mb-3">Contenido anterior</h2>
          <div className="space-y-2">
            {previousContent.map(({ checkin, day }) => (
              <div key={checkin.id} className="flex items-center gap-3 bg-revive-cream rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-revive-green text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-semibold text-revive-dark truncate">{day.title || `Día ${day.day_number}`}</p>
                  <p className="text-xs text-muted-foreground">{day.day_number >= 85 ? "Consolida 6" : `Día ${day.day_number}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}