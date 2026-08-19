import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PilotAliendaForm() {
  const [form, setForm] = useState({ email: "", public_name: "", whatsapp: "", force_active: false, reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.public_name || !form.reason.trim()) { setError("Correo, nombre y motivo son obligatorios."); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("createPilotAliada", form);
      setResult(res?.data || res);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-revive-green" />
        <h2 className="font-heading font-bold text-revive-dark">Crear Aliada piloto</h2>
      </div>
      <p className="text-xs text-muted-foreground">Se invita al correo (sin hardcodear contraseña), se asigna rol aliada y se marca is_test_account. Actívala para revisar flujos sin pasar por capacitación.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 text-red-600 mt-0.5" /><p className="text-xs text-red-700">{error}</p></div>}
      {result && (
        <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-revive-dark mt-0.5" />
          <div className="text-xs text-revive-dark">
            <p className="font-heading font-bold">Aliada piloto creada</p>
            <p>Código: {result.profile?.aliada_code} · Estado: {result.profile?.status} · Capacitación: {result.profile?.training_status}</p>
            {result.invited && <p className="text-muted-foreground mt-1">Se envó invitación al correo. La piloto define su contraseña desde el enlace.</p>}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="email" required placeholder="Correo de la piloto" value={form.email} onChange={(e) => set("email", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        <input type="text" required placeholder="Nombre público" value={form.public_name} onChange={(e) => set("public_name", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        <input type="tel" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        <input type="text" required placeholder="Motivo (auditoría)" value={form.reason} onChange={(e) => set("reason", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
          <input type="checkbox" checked={form.force_active} onChange={(e) => set("force_active", e.target.checked)} className="w-4 h-4 accent-revive-green" />
          <span className="text-xs text-muted-foreground">Marcar como <b>active</b> y capacitación completada (para revisar flujos sin pasar por capacitación)</span>
        </label>
        <button type="submit" disabled={busy} className="sm:col-span-2 flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm py-3 rounded-xl hover:bg-revive-dark-mid disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Crear piloto
        </button>
      </form>
    </div>
  );
}