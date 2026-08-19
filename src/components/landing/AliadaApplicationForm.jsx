import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, ArrowRight, Loader2, AlertCircle } from "lucide-react";

const EXPERIENCIA_OPTS = [
  "Venta directa o catálogo",
  "Atención al cliente",
  "Servicios o wellness",
  "Sin experiencia",
  "Otra",
];
const TIEMPO_OPTS = [
  "Mañanas",
  "Tardes",
  "Noches",
  "Tiempo completo",
  "Fines de semana",
];

function getUtms() {
  const p = new URLSearchParams(window.location.search);
  const utms = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
    const v = p.get(k);
    if (v) utms[k] = v;
  });
  return utms;
}

function buildCampaign(utms) {
  if (!Object.keys(utms).length) return "";
  return Object.entries(utms).map(([k, v]) => `${k}=${v}`).join("|");
}

const inputCls = "w-full border border-input rounded-lg px-4 py-3 text-revive-dark placeholder-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 transition-colors";

export default function AliadaApplicationForm() {
  const [form, setForm] = useState({
    nombre: "", whatsapp: "", email: "", zona: "", ocupacion: "",
    experiencia_venta: "", tiempo_disponible: "", motivo: "", consent: false, website: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (form.nombre.trim().length < 2) e.nombre = "Escribe tu nombre completo.";
    const digits = form.whatsapp.replace(/[^\d]/g, "");
    if (digits.length < 10) e.whatsapp = "Escribe tu WhatsApp con código de país (ej. +52 55 0000 0000).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Escribe un correo válido.";
    if (form.zona.trim().length < 2) e.zona = "Indica alcaldía, municipio o zona.";
    if (form.ocupacion.trim().length < 2) e.ocupacion = "Indica tu ocupación o actividad actual.";
    if (!form.experiencia_venta) e.experiencia_venta = "Selecciona una opción.";
    if (!form.tiempo_disponible) e.tiempo_disponible = "Selecciona una opción.";
    if (form.motivo.trim().length < 10) e.motivo = "Cuéntanos por qué quieres ser Aliada (mínimo 10 caracteres).";
    if (!form.consent) e.consent = "Debes aceptar la política de privacidad y contacto.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const utms = getUtms();
      await base44.functions.invoke("submitAliadaApplication", {
        full_name: form.nombre.trim(),
        phone: form.whatsapp.trim(),
        email: form.email.trim().toLowerCase(),
        ciudad: form.zona.trim(),
        ocupacion: form.ocupacion.trim(),
        experiencia_venta: form.experiencia_venta,
        tiempo_disponible: form.tiempo_disponible,
        mensaje: form.motivo.trim(),
        consent: true,
        website: form.website,
        source_domain: "aliadaservivo.com",
        campaign: buildCampaign(utms),
      });
      setDone(true);
    } catch (err) {
      setServerError(err?.response?.data?.error || "No se pudo enviar tu postulación. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-border shadow-sm">
        <CheckCircle className="w-16 h-16 text-revive-green mx-auto mb-4" />
        <h3 className="font-heading font-bold text-2xl text-revive-dark mb-2">Recibimos tu postulación</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">El equipo Ser Vivo la revisará y te contactará.</p>
        <a href="https://apprevive7.mx/login" target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-revive-green font-heading font-semibold text-sm hover:underline">
          ¿Ya fuiste aprobada? Inicia sesión →
        </a>
      </div>
    );
  }

  const field = (name, label, input) => (
    <div>
      <label className="block text-muted-foreground text-xs font-heading font-semibold uppercase tracking-wide mb-1.5">{label}</label>
      {input}
      {errors[name] && <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-border shadow-lg p-6 sm:p-8 space-y-4">
      {/* Honeypot invisible para bots */}
      <input type="text" tabIndex={-1} autoComplete="off" name="website" value={form.website}
        onChange={(e) => set("website", e.target.value)}
        className="absolute opacity-0 pointer-events-none -left-[9999px] h-0 w-0" aria-hidden="true" />

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("nombre", "Nombre completo", <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Tu nombre completo" className={inputCls} />)}
        {field("whatsapp", "WhatsApp", <input type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+52 55 0000 0000" className={inputCls} />)}
        {field("email", "Correo", <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@email.com" className={inputCls} />)}
        {field("zona", "Alcaldía, municipio o zona", <input type="text" value={form.zona} onChange={(e) => set("zona", e.target.value)} placeholder="Ej. Coyoacán, CDMX" className={inputCls} />)}
        {field("ocupacion", "Ocupación o actividad actual", <input type="text" value={form.ocupacion} onChange={(e) => set("ocupacion", e.target.value)} placeholder="Ej. Estudiante, empleada, emprendedora" className={inputCls} />)}
        {field("experiencia_venta", "Experiencia de venta o atención a personas",
          <select value={form.experiencia_venta} onChange={(e) => set("experiencia_venta", e.target.value)} className={inputCls + " bg-white"}>
            <option value="">Selecciona…</option>
            {EXPERIENCIA_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {field("tiempo_disponible", "Tiempo disponible",
          <select value={form.tiempo_disponible} onChange={(e) => set("tiempo_disponible", e.target.value)} className={inputCls + " bg-white"}>
            <option value="">Selecciona…</option>
            {TIEMPO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>

      {field("motivo", "¿Por qué quieres ser Aliada?",
        <textarea rows={3} value={form.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Cuéntanos tu motivo en un par de líneas…" className={inputCls + " resize-none"} />
      )}

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 w-4 h-4 accent-revive-green flex-shrink-0" />
        <span className="text-xs text-muted-foreground leading-relaxed">
          Acepto la política de privacidad y que Ser Vivo me contacte por WhatsApp y correo sobre mi postulación.
        </span>
      </label>
      {errors.consent && <p className="text-red-600 text-xs -mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.consent}</p>}

      <button type="submit" disabled={submitting}
        className="w-full bg-revive-green text-revive-dark font-heading font-bold py-4 rounded-xl hover:bg-revive-green-light transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <>Enviar mi postulación <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}