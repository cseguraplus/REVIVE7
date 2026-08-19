import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Heart, LogIn } from "lucide-react";

const INTENSIDAD_OPTS = [
  { v: "renueva_7", label: "Renueva 7" },
  { v: "activa_7", label: "Activa 7" },
  { v: "evoluciona_7", label: "Evoluciona 7" },
  { v: "orientacion", label: "Necesito orientación" },
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

export default function LeadInterestForm() {
  const [referralCode, setReferralCode] = useState("");
  const [aliadaName, setAliadaName] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [form, setForm] = useState({
    nombre: "", whatsapp: "", email: "", intensidad: "", ciudad: "", consent: false, website: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Lee referral_code o aliada de la URL y valida de forma pública
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = (p.get("aliada") || p.get("referral_code") || p.get("ref") || "").trim();
    if (!code) return;
    setReferralCode(code);
    setCheckingCode(true);
    base44.functions.invoke("lookupAliadaByCode", { code })
      .then((res) => {
        if (res.data && res.data.valid) setAliadaName(res.data.public_name || "");
        else setReferralCode(""); // código inválido → prospecto general
      })
      .catch(() => setReferralCode(""))
      .finally(() => setCheckingCode(false));
  }, []);

  const validate = () => {
    const e = {};
    if (form.nombre.trim().length < 2) e.nombre = "Escribe tu nombre completo.";
    const digits = form.whatsapp.replace(/[^\d]/g, "");
    if (digits.length < 10) e.whatsapp = "Escribe tu WhatsApp con código de país (ej. +52 55 0000 0000).";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "El correo no parece válido; déjalo vacío si prefieres.";
    if (form.ciudad.trim().length < 2) e.ciudad = "Indica tu ciudad o zona.";
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
      await base44.functions.invoke("submitClientLead", {
        full_name: form.nombre.trim(),
        phone: form.whatsapp.trim(),
        email: form.email.trim().toLowerCase(),
        ciudad: form.ciudad.trim(),
        intensity_interest: form.intensidad || null,
        referral_code: referralCode || null,
        consent: true,
        website: form.website,
        source_domain: "revive7.mx",
        campaign: buildCampaign(utms),
      });
      setDone(true);
    } catch (err) {
      setServerError(err?.response?.data?.error || "No se pudo enviar tu información. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <section className="py-20 px-6 bg-revive-cream">
        <div className="max-w-xl mx-auto text-center bg-white rounded-2xl border border-border shadow-lg p-8">
          <CheckCircle className="w-16 h-16 text-revive-green mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-revive-dark mb-2">¡Gracias, {form.nombre.split(" ")[0]}!</h2>
          <p className="text-muted-foreground mb-1">Recibimos tu información.</p>
          <p className="text-muted-foreground mb-6">
            {aliadaName
              ? `Tu Aliada Revive 7 (${aliadaName}) te contactará por WhatsApp pronto.`
              : "Una Aliada Revive 7 te contactará por WhatsApp pronto."}
          </p>
          <a href="https://apprevive7.mx/login" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-revive-green font-heading font-semibold text-sm hover:underline">
            <LogIn className="w-4 h-4" /> Ya estoy inscrita
          </a>
        </div>
      </section>
    );
  }

  const field = (name, label, input, hint) => (
    <div>
      <label className="block text-muted-foreground text-xs font-heading font-semibold uppercase tracking-wide mb-1.5">{label}</label>
      {input}
      {hint && !errors[name] && <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>}
      {errors[name] && <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[name]}</p>}
    </div>
  );

  return (
    <section id="interes" className="py-20 px-6 bg-revive-cream">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block bg-revive-green/20 text-revive-dark font-heading font-semibold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Quiero que me contacten
          </span>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-3">Déjanos tus datos y te ayudamos a empezar</h2>
          <p className="text-muted-foreground text-base">Una Aliada Revive 7 te contactará por WhatsApp para resolver tus dudas.</p>
        </div>

        {(checkingCode || aliadaName) && (
          <div className="mb-5 flex items-center gap-2.5 bg-revive-green-pale border border-revive-green/30 rounded-xl px-4 py-3">
            {checkingCode ? <Loader2 className="w-4 h-4 animate-spin text-revive-dark" /> : <Heart className="w-4 h-4 text-revive-dark" />}
            <p className="text-sm font-heading font-semibold text-revive-dark">
              {checkingCode ? "Verificando tu Aliada…" : `Tu Aliada Revive 7: ${aliadaName}`}
            </p>
          </div>
        )}

        <form onSubmit={submit} noValidate className="bg-white rounded-2xl border border-border shadow-lg p-6 sm:p-8 space-y-4">
          <input type="text" tabIndex={-1} autoComplete="off" name="website" value={form.website}
            onChange={(e) => set("website", e.target.value)}
            className="absolute opacity-0 pointer-events-none -left-[9999px] h-0 w-0" aria-hidden="true" />

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("nombre", "Nombre completo", <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Tu nombre completo" className={inputCls} />)}
            {field("whatsapp", "WhatsApp", <input type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+52 55 0000 0000" className={inputCls} />)}
            {field("email", "Correo (recomendado)", <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@email.com" className={inputCls} />, "Opcional, pero nos ayuda a enviarte detalles.")}
            {field("ciudad", "Ciudad o zona", <input type="text" value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Ej. Monterrey, N.L." className={inputCls} />)}
          </div>

          {field("intensidad", "¿Qué Kit te interesa? (opcional)",
            <select value={form.intensidad} onChange={(e) => set("intensidad", e.target.value)} className={inputCls + " bg-white"}>
              <option value="">Selecciona…</option>
              {INTENSIDAD_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 w-4 h-4 accent-revive-green flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Acepto la política de privacidad y que Ser Vivo me contacte por WhatsApp y correo.
            </span>
          </label>
          {errors.consent && <p className="text-red-600 text-xs -mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.consent}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-revive-green text-revive-dark font-heading font-bold py-4 rounded-xl hover:bg-revive-green-light transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <>Quiero que me contacten <ArrowRight className="w-4 h-4" /></>}
          </button>
          <a href="https://apprevive7.mx/login" target="_blank" rel="noopener noreferrer"
            className="block text-center text-revive-green font-heading font-semibold text-sm hover:underline">
            Ya estoy inscrita
          </a>
        </form>
      </div>
    </section>
  );
}