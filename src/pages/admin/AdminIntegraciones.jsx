import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plug, Send, Copy, Check, AlertCircle } from "lucide-react";

const ENDPOINTS = [
  {
    key: "submitAliadaApplication",
    title: "submitAliadaApplication",
    desc: "Postulaciones de Aliada desde aliadaservivo.com",
    fields: [
      { name: "full_name", required: true, desc: "2-120 caracteres" },
      { name: "email", required: true, desc: "Email válido" },
      { name: "phone", required: true, desc: "Mínimo 7 dígitos" },
      { name: "ciudad", required: false, desc: "Texto" },
      { name: "mensaje", required: false, desc: "Hasta 2000 caracteres" },
      { name: "source_domain", required: false, desc: "Por defecto aliadaservivo.com" },
      { name: "campaign", required: false, desc: "Identificador de campaña" },
      { name: "consent", required: true, desc: "Debe ser true" },
      { name: "website", required: false, desc: "Honeypot (dejar vacío)" },
    ],
  },
  {
    key: "submitClientLead",
    title: "submitClientLead",
    desc: "Leads de clienta desde revive7.mx; reconoce referral_code de Aliada activa",
    fields: [
      { name: "full_name", required: true, desc: "2-120 caracteres" },
      { name: "email", required: true, desc: "Email válido" },
      { name: "phone", required: true, desc: "Mínimo 7 dígitos" },
      { name: "referral_code", required: false, desc: "Código de Aliada activa" },
      { name: "source_domain", required: false, desc: "Por defecto revive7.mx" },
      { name: "campaign", required: false, desc: "Identificador de campaña" },
      { name: "consent", required: true, desc: "Debe ser true" },
      { name: "website", required: false, desc: "Honeypot (dejar vacío)" },
    ],
  },
];

const ORIGINS = [
  "https://aliadaservivo.com",
  "https://www.aliadaservivo.com",
  "https://revive7.mx",
  "https://www.revive7.mx",
];

export default function AdminIntegraciones() {
  const [tab, setTab] = useState(ENDPOINTS[0].key);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", ciudad: "", mensaje: "", referral_code: "", source_domain: "", campaign: "", consent: true, website: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState({ solicitudes: [], leads: [] });
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const [sols, leads] = await Promise.all([
        base44.entities.SolicitudAliada.list("-created_date", 10),
        base44.entities.Lead.list("-created_date", 10),
      ]);
      setRecent({ solicitudes: sols || [], leads: leads || [] });
    } catch (e) { /* ignore */ }
    finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  const send = async (e) => {
    e.preventDefault();
    setSending(true); setResult(null);
    try {
      const res = await base44.functions.invoke(tab, form);
      setResult({ status: res.status, data: res.data });
      await loadRecent();
    } catch (err) {
      setResult({ status: err?.response?.status || 500, data: { error: err?.response?.data?.error || err.message } });
    } finally { setSending(false); }
  };

  const copyCurl = () => {
    const curl = `curl -X POST <URL_PUBLICA>/api/functions/${tab} \\\n  -H "Content-Type: application/json" \\\n  -H "Origin: https://revive7.mx" \\\n  -d '${JSON.stringify({ ...form, website: undefined }, null, 0)}'`;
    navigator.clipboard.writeText(curl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const ep = ENDPOINTS.find((x) => x.key === tab);
  const recentList = tab === "submitAliadaApplication" ? recent.solicitudes : recent.leads;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Integraciones</h1>
        <p className="text-sm text-muted-foreground">API pública para landings. CORS limitado, validación, honeypot y dedupe.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {ENDPOINTS.map((e) => (
          <button key={e.key} onClick={() => setTab(e.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-semibold border-b-2 -mb-px ${tab === e.key ? "border-revive-green text-revive-dark" : "border-transparent text-muted-foreground"}`}>
            <Plug className="w-4 h-4" /> {e.title}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-heading font-bold text-revive-dark text-sm">{ep.desc}</h2>
        <div className="bg-revive-cream rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-heading font-semibold text-revive-dark">Método:</p> POST (OPTIONS para preflight)
          <p className="font-heading font-semibold text-revive-dark mt-2">Orígenes permitidos (CORS):</p>
          <ul className="list-disc list-inside">{ORIGINS.map((o) => <li key={o} className="font-mono">{o}</li>)}</ul>
          <p className="font-heading font-semibold text-revive-dark mt-2">URL pública:</p>
          <p className="font-mono">Disponible en Dashboard → Code → Functions → {ep.key}</p>
        </div>
        <div>
          <p className="text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Campos esperados</p>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-1.5">Campo</th><th>Requerido</th><th>Descripción</th></tr></thead>
            <tbody>
              {ep.fields.map((f) => (
                <tr key={f.name} className="border-b border-border/50">
                  <td className="py-1.5 font-mono">{f.name}</td>
                  <td>{f.required ? <span className="text-red-600 font-semibold">Sí</span> : "No"}</td>
                  <td className="text-muted-foreground">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={copyCurl} className="flex items-center gap-2 text-sm text-revive-dark font-heading font-semibold">
          {copied ? <Check className="w-4 h-4 text-revive-green" /> : <Copy className="w-4 h-4" />} Copiar ejemplo cURL
        </button>
      </div>

      <form onSubmit={send} className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-heading font-bold text-revive-dark text-sm">Prueba manual</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2" />
          <input placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
          <input placeholder="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
          {tab === "submitAliadaApplication" && (
            <>
              <input placeholder="ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
              <input placeholder="mensaje" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            </>
          )}
          {tab === "submitClientLead" && (
            <input placeholder="referral_code" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2" />
          )}
          <input placeholder="campaign" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
          <input placeholder="source_domain" value={form.source_domain} onChange={(e) => setForm({ ...form, source_domain: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
          <input placeholder="honeypot (dejar vacío)" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm col-span-2" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> consent</label>
        <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar prueba</>}
        </button>
        {result && (
          <div className={`rounded-lg p-3 text-sm ${result.status >= 200 && result.status < 300 ? "bg-revive-green-pale text-revive-dark" : "bg-red-50 text-red-700"}`}>
            <p className="font-heading font-semibold flex items-center gap-1.5">{result.status >= 200 && result.status < 300 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} HTTP {result.status}</p>
            <pre className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        )}
      </form>

      <div className="bg-white border border-border rounded-2xl p-5">
        <h2 className="font-heading font-bold text-revive-dark text-sm mb-3">Últimos registros ({tab === "submitAliadaApplication" ? "Solicitudes" : "Leads"})</h2>
        {loadingRecent ? <Loader2 className="w-5 h-5 animate-spin text-revive-green" /> : recentList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros recientes.</p>
        ) : (
          <div className="space-y-2">
            {recentList.map((r) => (
              <div key={r.id} className="bg-revive-cream rounded-lg px-3 py-2 text-xs">
                <p className="font-heading font-semibold text-revive-dark">{r.nombre || r.full_name} · {r.email || r.telefono}</p>
                <p className="text-muted-foreground">{r.source_domain}{r.campaign ? ` · ${r.campaign}` : ""} · {new Date(r.created_date).toLocaleString("es-MX")}{r.ip ? ` · ${r.ip}` : ""}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">No se exponen secretos ni datos internos en el frontend.</p>
      </div>
    </div>
  );
}