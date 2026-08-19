import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, Sparkles, Clock, HeartHandshake, CalendarOff, CalendarClock, RefreshCw, ClipboardList, Inbox, Package, ChevronRight } from "lucide-react";
import AliadaAlertCard from "@/components/aliada/AliadaAlertCard";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

function fmt(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""; }

export default function AliadaInicio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getAliadaDashboard", {})
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || err.message || "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div><p className="font-heading font-semibold text-red-800">No se pudieron cargar tus datos</p><p className="text-sm text-red-700 mt-1">{error}</p></div>
      </div>
    );
  }

  const { aliada_profile, clientas, low_inventory, prospect_overdue, effective_date } = data;
  const aliadaName = aliada_profile?.public_name || "tu aliada";
  const active = clientas.filter((c) => c.status === "active" || c.status === "pending");

  const groups = [
    { key: "incomplete_previous_day", icon: Clock, title: "Día anterior incompleto", hint: "Cierran su día de ayer con tu apoyo", items: active.filter((c) => c.incomplete_previous_day) },
    { key: "con_dificultad", icon: HeartHandshake, title: "Con dificultad", hint: "Se sienten bajas hoy", items: active.filter((c) => c.con_dificultad) },
    { key: "inactive_2_days", icon: CalendarOff, title: "Sin actividad (2 días)", hint: "No las hemos visto en dos días", items: active.filter((c) => c.inactive_2_days) },
    { key: "week_ending_soon", icon: CalendarClock, title: "Próximas a terminar semana", hint: "Conversa su siguiente Kit", items: active.filter((c) => c.week_ending_soon) },
    { key: "week_ended_no_renewal", icon: RefreshCw, title: "Semana terminada sin renovación", hint: "Aún sin Kit de la semana actual", items: active.filter((c) => c.week_ended_no_renewal) },
    { key: "prep_pending", icon: ClipboardList, title: "Preparación pendiente", hint: "Aún no inician su programa", items: active.filter((c) => c.prep_pending) },
  ];

  const msg = (c, text) => `Hola ${c.full_name || "clienta"}, soy ${aliadaName} de Ser Vivo. ${text}`;
  const clientMessages = {
    incomplete_previous_day: (c) => msg(c, "¿Cómo te fue con tu día de ayer? Cualquier duda aquí estoy. 🌿"),
    con_dificultad: (c) => msg(c, "vi que ayer fue con dificultad. ¿Platicamos? Estoy para apoyarte. 💚"),
    inactive_2_days: (c) => msg(c, "hace un par de días no te veo. ¿Todo bien? Retoma tu proceso cuando puedas. 🌱"),
    week_ending_soon: (c) => msg(c, "tu semana está por terminar. ¿Listas para tu siguiente Kit? Avísame. 🌿"),
    week_ended_no_renewal: (c) => msg(c, "tu semana terminó sin renovación. ¿Platicamos tu siguiente Kit? 💚"),
    prep_pending: (c) => msg(c, "falta completar tu preparación. ¿Te ayudo a avanzar? 🌱"),
  };
  const clientFecha = {
    incomplete_previous_day: () => fmt(effective_date),
    con_dificultad: () => fmt(effective_date),
    inactive_2_days: (c) => fmt(c.last_activity_date),
    week_ending_soon: (c) => fmt(c.renovation_due_date),
    week_ended_no_renewal: (c) => fmt(c.renovation_due_date),
    prep_pending: () => fmt(effective_date),
  };
  const clientEstado = (c) => c.status === "active" ? "Activa" : c.status === "pending" ? "Preparación" : c.status;

  const prospectItems = (prospect_overdue || []).map((p) => ({
    nombre: p.nombre,
    motivo: `Acción vencida: ${p.next_action || "contactar"}`,
    fecha: fmt(p.next_action_date),
    estado: p.status,
    phone: p.telefono,
    message: `Hola ${p.nombre}, soy ${aliadaName} de Ser Vivo. ¿Te interesa comenzar esta semana? 🌿`,
  }));

  const inventoryItems = (low_inventory || []).map((i) => ({
    nombre: INTENSITY_LABEL[i.intensity] || i.intensity,
    motivo: "Inventario bajo",
    fecha: fmt(effective_date),
    estado: i.status === "out_of_stock" ? "Agotado" : i.status === "low_stock" ? "Bajo" : "Disponible",
    intensity: i.intensity,
    available: i.available,
  }));

  const totalAlerts = groups.reduce((n, g) => n + g.items.length, 0) + prospectItems.length + inventoryItems.length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-revive-dark text-white rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-xl">A quién atender hoy</h1>
            <p className="text-white/70 text-sm truncate">{aliadaName} · Código <span className="font-mono text-revive-green-light">{aliada_profile?.aliada_code}</span>{data.using_simulated && <span className="ml-2 text-purple-300 text-xs">(modo prueba)</span>}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-heading font-bold text-revive-green-light">{totalAlerts}</p>
            <p className="text-xs text-white/60">Atender hoy</p>
          </div>
        </div>
      </div>

      {totalAlerts === 0 && (
        <div className="bg-white border border-border rounded-xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-revive-green mx-auto mb-2" />
          <p className="font-heading font-semibold text-revive-dark">Todo en orden hoy 🌿</p>
          <p className="text-sm text-muted-foreground mt-1">No hay alertas prioritarias. El contacto con tus clientas sigue siendo manual.</p>
        </div>
      )}

      {groups.map((g) => g.items.length > 0 && (
        <section key={g.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <g.icon className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">{g.title}</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{g.items.length}</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{g.hint}</p>
          <div className="space-y-3">
            {g.items.map((c) => (
              <AliadaAlertCard
                key={c.clienta_id || c.clienta_profile_id}
                nombre={c.full_name || `Clienta ${(c.clienta_id || "").slice(-6)}`}
                motivo={g.title}
                fecha={clientFecha[g.key](c)}
                estado={clientEstado(c)}
                phone={c.phone}
                message={clientMessages[g.key](c)}
              />
            ))}
          </div>
        </section>
      ))}

      {prospectItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">Prospectos con próxima acción vencida</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{prospectItems.length}</span>
          </div>
          <div className="space-y-3">
            {prospectItems.map((p, i) => <AliadaAlertCard key={i} {...p} />)}
          </div>
        </section>
      )}

      {inventoryItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">Inventario bajo</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{inventoryItems.length}</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Solicita carga a Operaciones.</p>
          <div className="space-y-3">
            {inventoryItems.map((it, i) => <AliadaAlertCard key={i} {...it} />)}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/aliada/clientas" className="flex items-center justify-between gap-2 bg-white border border-border rounded-xl p-4 hover:bg-muted/40 transition-colors">
          <div><p className="font-heading font-semibold text-revive-dark text-sm">Mis clientas</p><p className="text-xs text-muted-foreground">{clientas.length} asignadas</p></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/aliada/prospectos" className="flex items-center justify-between gap-2 bg-white border border-border rounded-xl p-4 hover:bg-muted/40 transition-colors">
          <div><p className="font-heading font-semibold text-revive-dark text-sm">Prospectos</p><p className="text-xs text-muted-foreground">CRM</p></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}