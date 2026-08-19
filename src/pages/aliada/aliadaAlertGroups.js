// Lógica de negocio de AliadaInicio: agrupación de clientas por categoría de alerta
// y generación de mensajes de WhatsApp. Separado del componente para que la UI solo
// se encargue de renderizar lo que esta función ya calculó.
import { Clock, HeartHandshake, CalendarOff, CalendarClock, RefreshCw, ClipboardList } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

export function fmt(d) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
}

const GROUP_DEFS = [
  { key: "incomplete_previous_day", icon: Clock, title: "Día anterior incompleto", hint: "Cierran su día de ayer con tu apoyo" },
  { key: "con_dificultad", icon: HeartHandshake, title: "Con dificultad", hint: "Se sienten bajas hoy" },
  { key: "inactive_2_days", icon: CalendarOff, title: "Sin actividad (2 días)", hint: "No las hemos visto en dos días" },
  { key: "week_ending_soon", icon: CalendarClock, title: "Próximas a terminar semana", hint: "Conversa su siguiente Kit" },
  { key: "week_ended_no_renewal", icon: RefreshCw, title: "Semana terminada sin renovación", hint: "Aún sin Kit de la semana actual" },
  { key: "prep_pending", icon: ClipboardList, title: "Preparación pendiente", hint: "Aún no inician su programa" },
];

function buildClientMessage(aliadaName, c, text) {
  return `Hola ${c.full_name || "clienta"}, soy ${aliadaName} de Ser Vivo. ${text}`;
}

const CLIENT_MESSAGE_TEXT = {
  incomplete_previous_day: "¿Cómo te fue con tu día de ayer? Cualquier duda aquí estoy. 🌿",
  con_dificultad: "vi que ayer fue con dificultad. ¿Platicamos? Estoy para apoyarte. 💚",
  inactive_2_days: "hace un par de días no te veo. ¿Todo bien? Retoma tu proceso cuando puedas. 🌱",
  week_ending_soon: "tu semana está por terminar. ¿Listas para tu siguiente Kit? Avísame. 🌿",
  week_ended_no_renewal: "tu semana terminó sin renovación. ¿Platicamos tu siguiente Kit? 💚",
  prep_pending: "falta completar tu preparación. ¿Te ayudo a avanzar? 🌱",
};

const CLIENT_FECHA = {
  incomplete_previous_day: (c, effectiveDate) => fmt(effectiveDate),
  con_dificultad: (c, effectiveDate) => fmt(effectiveDate),
  inactive_2_days: (c) => fmt(c.last_activity_date),
  week_ending_soon: (c) => fmt(c.renovation_due_date),
  week_ended_no_renewal: (c) => fmt(c.renovation_due_date),
  prep_pending: (c, effectiveDate) => fmt(effectiveDate),
};

function clientEstado(c) {
  return c.status === "active" ? "Activa" : c.status === "pending" ? "Preparación" : c.status;
}

/**
 * Toma la respuesta cruda de getAliadaDashboard y devuelve todo lo que la UI
 * necesita para renderizar: grupos de clientas por categoría de alerta (con
 * mensaje de WhatsApp ya armado por clienta), prospectos con acción vencida,
 * inventario bajo, y el total de alertas.
 */
export function buildAliadaAlertGroups(data) {
  const { aliada_profile, clientas, low_inventory, prospect_overdue, effective_date } = data;
  const aliadaName = aliada_profile?.public_name || "tu aliada";
  const active = clientas.filter((c) => c.status === "active" || c.status === "pending");

  const groups = GROUP_DEFS.map((def) => ({
    ...def,
    items: active.filter((c) => c[def.key]).map((c) => ({
      clienta: c,
      fecha: CLIENT_FECHA[def.key](c, effective_date),
      estado: clientEstado(c),
      message: buildClientMessage(aliadaName, c, CLIENT_MESSAGE_TEXT[def.key]),
    })),
  }));

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

  return { aliadaName, groups, prospectItems, inventoryItems, totalAlerts };
}
