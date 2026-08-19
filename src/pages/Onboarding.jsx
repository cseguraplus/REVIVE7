import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Revive7Logo from "@/components/Revive7Logo";
import { Loader2, CheckCircle } from "lucide-react";

export default function Onboarding() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    phone: "", public_name: "", whatsapp: "", aliada_code: "",
    start_goal: "", share_emotional_default: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then((m) => {
        setMe(m);
        setForm((p) => ({ ...p, phone: m.phone || (m.data && m.data.phone) || "" }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const appRole = me?.app_role || (me?.data && me?.data?.app_role) || "clienta";
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (appRole === "clienta") {
        const cps = await base44.entities.ClientaProfile.filter({ user_id: me.id });
        if (!cps.length) {
          await base44.entities.ClientaProfile.create({
            user_id: me.id, status: "active",
            start_goal: form.start_goal, share_emotional_default: form.share_emotional_default,
          });
        } else {
          await base44.entities.ClientaProfile.update(cps[0].id, {
            status: "active",
            start_goal: form.start_goal || cps[0].start_goal,
            share_emotional_default: form.share_emotional_default,
          });
        }
      } else if (appRole === "aliada") {
        const aps = await base44.entities.AliadaProfile.filter({ user_id: me.id });
        if (!aps.length) {
          await base44.entities.AliadaProfile.create({
            user_id: me.id, public_name: form.public_name, whatsapp: form.whatsapp,
            aliada_code: form.aliada_code, status: "pending", training_status: "not_started",
          });
        } else {
          await base44.entities.AliadaProfile.update(aps[0].id, {
            public_name: form.public_name || aps[0].public_name,
            whatsapp: form.whatsapp || aps[0].whatsapp,
            aliada_code: form.aliada_code || aps[0].aliada_code,
          });
        }
      }
      await base44.functions.invoke("completeOnboarding", { phone: form.phone || undefined });
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      setError(err?.message || "No se pudo completar el onboarding.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-revive-cream">
        <Loader2 className="w-8 h-8 animate-spin text-revive-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-revive-cream via-white to-revive-green-pale flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><Revive7Logo size="lg" /></div>
          <p className="text-muted-foreground text-sm">Completa tu perfil para continuar</p>
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-lg p-8">
          {done ? (
            <div className="text-center py-8">
              <CheckCircle className="w-14 h-14 text-revive-green mx-auto mb-4" />
              <h2 className="font-heading font-bold text-xl text-revive-dark">¡Perfil completado!</h2>
              <p className="text-muted-foreground text-sm mt-1">Redirigiendo…</p>
            </div>
          ) : (
            <>
              <h2 className="font-heading font-bold text-xl text-revive-dark mb-1">Onboarding · {appRole}</h2>
              <p className="text-muted-foreground text-sm mb-5">Configura tus datos de {appRole === "clienta" ? "clienta" : appRole === "aliada" ? "aliada" : "equipo"}.</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <Field label="Teléfono" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="55 1234 5678" />

                {appRole === "clienta" && (
                  <>
                    <Field label="Objetivo inicial" value={form.start_goal} onChange={(v) => set("start_goal", v)} placeholder="¿Qué quieres lograr en 90 días?" />
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={form.share_emotional_default} onChange={(e) => set("share_emotional_default", e.target.checked)} className="mt-0.5 w-4 h-4 accent-revive-green" />
                      <span className="text-xs text-muted-foreground">Compartir mi estado emocional con mi aliada por defecto (puedes cambiarlo check-in por check-in).</span>
                    </label>
                  </>
                )}

                {appRole === "aliada" && (
                  <>
                    <Field label="Nombre público" value={form.public_name} onChange={(v) => set("public_name", v)} placeholder="Nombre que verán tus clientas" />
                    <Field label="WhatsApp" type="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="55 1234 5678" />
                    <Field label="Código de aliada" value={form.aliada_code} onChange={(v) => set("aliada_code", v)} placeholder="ALI-001" />
                  </>
                )}

                {(appRole === "operaciones" || appRole === "contenidos" || appRole === "superadmin") && (
                  <p className="text-sm text-muted-foreground">Solo necesitamos confirmar tu teléfono para activar tu cuenta.</p>
                )}

                <button type="submit" disabled={saving} className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl hover:bg-revive-dark-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Completar perfil"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
    </div>
  );
}