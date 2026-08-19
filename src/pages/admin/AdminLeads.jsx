import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Inbox, CheckCircle2, AlertTriangle, CopyCheck } from "lucide-react";

const DOMAIN_OPTIONS = [
  { value: "aliadaservivo.com", leadType: "aliada_application" },
  { value: "revive7.mx", leadType: "clienta_or_prospect" },
];

const assignmentLabels = {
  assigned_to_aliada: "Asignada a aliada",
  general_prospect: "Prospecto general (Ser Vivo)",
  pending: "Pendiente",
};

export default function AdminLeads() {
  const [form, setForm] = useState({
    source_domain: "revive7.mx",
    full_name: "",
    email: "",
    phone: "",
    referral_code: "",
    campaign: "",
    consent: false,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const loadLeads = async () => {
    try {
      const list = await base44.entities.Lead.list("-created_date", 50);
      setLeads(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const expectedType = DOMAIN_OPTIONS.find((d) => d.value === form.source_domain)?.leadType;

  const submit = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("createLandingLead", {
        source_domain: form.source_domain,
        lead_type: expectedType,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        referral_code: form.referral_code || undefined,
        campaign: form.campaign || undefined,
        consent: form.consent,
      });
      setResult(res.data);
      await loadLeads();
    } catch (e) {
      const d = e?.response?.data;
      if (d && d.duplicate) {
        setResult({ ok: false, duplicate: true, lead_id: d.lead_id, reason: d.reason });
      } else {
        setError(d?.error || e.message || "Error al enviar");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark flex items-center gap-2">
          <Inbox className="w-6 h-6 text-revive-green" /> Leads · Recepción central
        </h1>
        <p className="text-muted-foreground mt-1">
          Prueba manual del contrato <code className="text-sm">createLandingLead</code> para aliadaservivo.com y revive7.mx. Los formularios reales aún no están conectados.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Form */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-heading font-semibold text-revive-dark">Solicitud manual</h3>

          <div>
            <Label>Dominio de origen</Label>
            <select
              value={form.source_domain}
              onChange={(e) => setForm({ ...form, source_domain: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.value}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">lead_type derivado: <span className="font-mono">{expectedType}</span></p>
          </div>

          <div>
            <Label>Nombre completo</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="María García" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@ejemplo.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+52 55 1234 5678" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código de referido</Label>
              <Input value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} placeholder="ALIADA-TEST-01" />
            </div>
            <div>
              <Label>Campaña</Label>
              <Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="fb-verano" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: !!v })} />
            <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">Consentimiento otorgado</Label>
          </div>

          <Button onClick={submit} disabled={busy || !form.consent || !form.full_name || !form.email || !form.phone} className="w-full bg-revive-green hover:bg-revive-green-light text-revive-dark font-heading font-semibold">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Enviar lead</>}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {result && (
            <div className={`rounded-lg p-3 ${result.ok ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className="flex items-center gap-2">
                {result.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <CopyCheck className="w-4 h-4 text-amber-600" />}
                <p className={`text-sm font-heading font-semibold ${result.ok ? "text-green-800" : "text-amber-800"}`}>
                  {result.ok ? "Lead creado" : `Duplicado (${result.reason})`}
                </p>
              </div>
              <pre className="text-xs mt-2 bg-white/60 rounded p-2 overflow-auto font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Recent leads */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-revive-dark">Leads recientes</h3>
          {loadingLeads ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-revive-green" /></div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin leads aún.</p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-auto">
              {leads.map((l) => (
                <div key={l.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-semibold text-sm text-revive-dark truncate">{l.full_name}</p>
                    <span className="text-xs text-muted-foreground">{l.created_date ? String(l.created_date).slice(0, 16) : ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.source_domain} · {l.lead_type}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{l.email} · {l.phone}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.assignment_status === "assigned_to_aliada" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {assignmentLabels[l.assignment_status] || l.assignment_status}
                    </span>
                    {l.referral_code && <span className="text-xs font-mono text-muted-foreground">{l.referral_code}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}