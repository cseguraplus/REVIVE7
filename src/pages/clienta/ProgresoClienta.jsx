import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Lock, Flame } from "lucide-react";

export default function ProgresoClienta() {
  const [clienta, setClienta] = useState(null);
  const [progresos, setProgresos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      const cls = await base44.entities.Clienta.filter({ user_id: me.id });
      if (cls.length > 0) {
        const c = cls[0];
        setClienta(c);
        const prog = await base44.entities.ProgresoDiario.filter({ clienta_id: c.id });
        setProgresos(prog);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;
  if (!clienta) return <div className="text-center py-20 text-muted-foreground">Perfil no encontrado.</div>;

  const diasDesbloqueados = clienta.dias_desbloqueados || 0;
  const progMap = Object.fromEntries(progresos.map(p => [p.dia_numero, p]));
  const completados = progresos.filter(p => p.completado).length;
  const semanas = Array.from({ length: Math.ceil(diasDesbloqueados / 7) }, (_, i) => i + 1);

  // Racha
  let racha = 0;
  for (let i = diasDesbloqueados; i >= 1; i--) {
    if (progMap[i]?.completado) racha++;
    else break;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi Progreso</h1>
        <p className="text-muted-foreground text-sm mt-1">90 días de transformación Revive 7</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-sm">
          <p className="font-heading font-extrabold text-3xl text-revive-dark">{diasDesbloqueados}</p>
          <p className="text-xs text-muted-foreground font-heading font-semibold uppercase tracking-wide mt-1">Días desbloqueados</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-sm">
          <p className="font-heading font-extrabold text-3xl text-revive-green">{completados}</p>
          <p className="text-xs text-muted-foreground font-heading font-semibold uppercase tracking-wide mt-1">Completados</p>
        </div>
        <div className="bg-revive-dark rounded-2xl p-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-5 h-5 text-revive-green" />
            <p className="font-heading font-extrabold text-3xl text-white">{racha}</p>
          </div>
          <p className="text-xs text-white/60 font-heading font-semibold uppercase tracking-wide mt-1">Racha actual</p>
        </div>
      </div>

      {/* Barra global */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-revive-dark">Camino de 90 días</h2>
          <span className="font-heading font-bold text-revive-green text-lg">{Math.round((diasDesbloqueados / 90) * 100)}%</span>
        </div>
        <div className="bg-revive-cream rounded-full h-4 overflow-hidden">
          <div className="bg-revive-green h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(2, Math.min(100, (diasDesbloqueados / 90) * 100))}%` }}>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">Inicio</span>
          <span className="text-xs text-muted-foreground">Día 90 — Meta</span>
        </div>
      </div>

      {/* Grid semanal */}
      {semanas.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-heading font-bold text-revive-dark mb-5">Progreso por semana</h2>
          <div className="space-y-4">
            {semanas.map(s => {
              const diasSemana = Array.from({ length: 7 }, (_, i) => (s - 1) * 7 + i + 1);
              const completadosSemana = diasSemana.filter(d => progMap[d]?.completado).length;
              const desbloqueadosSemana = diasSemana.filter(d => d <= diasDesbloqueados).length;
              return (
                <div key={s}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wide">Semana {s}</span>
                    <span className="text-xs font-heading font-semibold text-revive-dark">{completadosSemana}/{desbloqueadosSemana} días</span>
                  </div>
                  <div className="flex gap-1.5">
                    {diasSemana.map(d => {
                      const desbloqueado = d <= diasDesbloqueados;
                      const completado = progMap[d]?.completado;
                      return (
                        <div key={d} title={`Día ${d}`}
                          className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-heading font-bold transition-colors ${completado ? "bg-revive-green text-white" : desbloqueado ? "bg-revive-cream text-revive-dark border-2 border-revive-green/30" : "bg-muted text-muted-foreground/30"}`}>
                          {completado ? "✓" : desbloqueado ? d : <Lock className="w-3 h-3" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}