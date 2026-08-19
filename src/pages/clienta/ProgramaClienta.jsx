import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Play, CheckCircle, Lock, ShoppingBag, ChevronRight } from "lucide-react";

export default function ProgramaClienta() {
  const [clienta, setClienta] = useState(null);
  const [contenidos, setContenidos] = useState([]);
  const [progresos, setProgresos] = useState([]);
  const [semanaActual, setSemanaActual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(null);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      const cls = await base44.entities.Clienta.filter({ user_id: me.id });
      if (cls.length > 0) {
        const c = cls[0];
        setClienta(c);
        const semActual = Math.ceil((c.dias_desbloqueados || 0) / 7) || 1;
        setSemanaActual(semActual);
        const [con, prog] = await Promise.all([
          base44.entities.ContenidoDiario.list("dia_numero", 90),
          base44.entities.ProgresoDiario.filter({ clienta_id: c.id }),
        ]);
        setContenidos(con); setProgresos(prog);
      }
      setLoading(false);
    };
    init();
  }, []);

  const toggleDia = async (diaNum) => {
    if (!clienta || diaNum > (clienta.dias_desbloqueados || 0)) return;
    setMarcando(diaNum);
    const existing = progresos.find(p => p.dia_numero === diaNum);
    if (existing) {
      await base44.entities.ProgresoDiario.update(existing.id, { completado: !existing.completado, fecha_completado: !existing.completado ? new Date().toISOString() : null });
      setProgresos(prev => prev.map(p => p.id === existing.id ? { ...p, completado: !p.completado } : p));
    } else {
      const nuevo = await base44.entities.ProgresoDiario.create({ clienta_id: clienta.id, dia_numero: diaNum, completado: true, fecha_completado: new Date().toISOString() });
      setProgresos(prev => [...prev, nuevo]);
    }
    setMarcando(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  if (!clienta) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground text-lg">Tu perfil de programa no está configurado.</p>
      <p className="text-sm text-muted-foreground mt-2">Contacta a tu aliada Ser Vivo.</p>
    </div>
  );

  const diasDesbloqueados = clienta.dias_desbloqueados || 0;
  const progresosMap = Object.fromEntries(progresos.map(p => [p.dia_numero, p]));
  const diasCompletados = progresos.filter(p => p.completado).length;
  const semanasDias = Array.from({ length: 7 }, (_, i) => (semanaActual - 1) * 7 + i + 1);
  const contenidoMap = Object.fromEntries(contenidos.map(c => [c.dia_numero, c]));

  // Next kit alert
  const semanasCompradas = Math.floor(diasDesbloqueados / 7);
  const diasRestantesEnSemana = diasDesbloqueados - (semanasCompradas - 1) * 7;
  const alertaRecompra = diasDesbloqueados > 0 && diasDesbloqueados % 7 <= 2 && diasDesbloqueados < 90;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm font-heading font-semibold uppercase tracking-wide">Hola,</p>
        <h1 className="font-heading font-bold text-2xl text-revive-dark mt-0.5">{clienta.nombre}</h1>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide">Tu progreso Revive 7</span>
            <span className="font-heading font-bold text-revive-green">{diasDesbloqueados}/90 días</span>
          </div>
          <div className="bg-revive-cream rounded-full h-3">
            <div className="bg-revive-green h-3 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (diasDesbloqueados / 90) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">{diasCompletados} días completados</span>
            <span className="text-xs text-muted-foreground">{Math.round((diasDesbloqueados / 90) * 100)}% del programa</span>
          </div>
        </div>
      </div>

      {/* Alerta recompra */}
      {alertaRecompra && (
        <div className="bg-revive-dark rounded-2xl p-5 flex items-center gap-4">
          <ShoppingBag className="w-8 h-8 text-revive-green flex-shrink-0" />
          <div className="flex-1">
            <p className="font-heading font-bold text-white">¡Es momento de tu siguiente kit!</p>
            <p className="text-white/70 text-sm mt-0.5">Tus días actuales se agotan pronto. Pide tu kit a tu aliada para seguir avanzando.</p>
          </div>
        </div>
      )}

      {diasDesbloqueados === 0 && (
        <div className="bg-revive-green-pale border border-revive-green/20 rounded-2xl p-6 text-center">
          <ShoppingBag className="w-10 h-10 text-revive-green mx-auto mb-3" />
          <h2 className="font-heading font-bold text-revive-dark mb-2">Empieza tu transformación</h2>
          <p className="text-muted-foreground text-sm">Pide tu primer kit a tu aliada Ser Vivo para desbloquear tus primeros 7 días del programa.</p>
        </div>
      )}

      {/* Semana selector */}
      {diasDesbloqueados > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: Math.ceil(diasDesbloqueados / 7) + 1 }, (_, i) => i + 1).slice(0, 13).map(s => {
              const bloqueada = s * 7 > diasDesbloqueados + 7;
              return (
                <button key={s} onClick={() => !bloqueada && setSemanaActual(s)} disabled={bloqueada}
                  className={`px-4 py-2 rounded-full text-xs font-heading font-bold whitespace-nowrap transition-colors flex-shrink-0 ${semanaActual === s ? "bg-revive-dark text-white" : bloqueada ? "bg-muted text-muted-foreground/40 cursor-not-allowed" : "bg-white border border-border text-muted-foreground hover:border-revive-green"}`}>
                  Semana {s}
                </button>
              );
            })}
          </div>

          {/* Días de la semana */}
          <div className="space-y-3">
            {semanasDias.map(diaNum => {
              const desbloqueado = diaNum <= diasDesbloqueados;
              const prog = progresosMap[diaNum];
              const completado = prog?.completado;
              const contenido = contenidoMap[diaNum];

              return (
                <div key={diaNum} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${desbloqueado ? "border-border hover:border-revive-green/30" : "border-border opacity-50"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-black text-sm ${completado ? "bg-revive-green text-white" : desbloqueado ? "bg-revive-cream text-revive-dark border-2 border-revive-green" : "bg-muted text-muted-foreground"}`}>
                      {completado ? <CheckCircle className="w-5 h-5" /> : desbloqueado ? diaNum : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wide">Día {diaNum}</span>
                        {!desbloqueado && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-heading font-semibold">Bloqueado</span>}
                      </div>
                      <h3 className="font-heading font-bold text-revive-dark">{contenido?.titulo || `Día ${diaNum} — Revive 7`}</h3>
                      {desbloqueado && contenido?.texto_acompanamiento && (
                        <p className="text-muted-foreground text-sm mt-1 leading-relaxed line-clamp-2">{contenido.texto_acompanamiento}</p>
                      )}
                      {desbloqueado && contenido?.accion_diaria && (
                        <div className="mt-2 bg-revive-cream rounded-lg px-3 py-2">
                          <p className="text-xs font-heading font-bold text-revive-dark">🎯 Acción: <span className="font-normal text-muted-foreground">{contenido.accion_diaria}</span></p>
                        </div>
                      )}
                    </div>
                    {desbloqueado && (
                      <div className="flex flex-col items-end gap-2">
                        {contenido?.video_url && (
                          <a href={contenido.video_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-revive-dark text-white text-xs font-heading font-bold px-3 py-1.5 rounded-full hover:bg-revive-dark-mid transition-colors">
                            <Play className="w-3 h-3" /> Ver video
                          </a>
                        )}
                        <button onClick={() => toggleDia(diaNum)} disabled={marcando === diaNum}
                          className={`text-xs font-heading font-semibold px-3 py-1.5 rounded-full transition-colors ${completado ? "bg-revive-green-pale text-revive-dark hover:bg-red-50 hover:text-red-600" : "bg-revive-green text-white hover:bg-revive-green-light"}`}>
                          {marcando === diaNum ? "..." : completado ? "✓ Completado" : "Marcar listo"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}