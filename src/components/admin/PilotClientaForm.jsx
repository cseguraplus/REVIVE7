import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PilotClientaForm() {
  const [aliadas, setAliadas] = useState([]);
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", aliada_id: "", send_invite: true, force_prepared: false, reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    base44.entities.AliadaProfile.filter({ status: "active" }).then((a) => {
      setAliadas(a || []);
      if (a && a[0]) setForm((p) => ({ ...p, aliada_id: a[0].id }));
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.full_name || !form.reason.trim()) { setError("Correo, nombre y motivo son obligatorios."); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("registerClientaPilot", form);
      setResult(res?.data || res);
    } catch (err) { setError(err?.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-revive-green" />
        <h2 className="font-heading font-bold text-revive-dark">Crear clienta piloto</h2>
      </div>
      <p className="text-xs text-muted-foreground">Se asigna a una Aliada activa y se marca is_test_account. Puedes enviar la invitación o marcar la cuenta como preparada (active) para probar flujos sin esperar el correo.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 text-red-600 mt-0.5" /><p className="text-xs text-red-700">{error}</p></div>}
      {result && (
        <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-revive-dark mt-0.5" />
          <div className="text-xs text-revive-dark">
            <p className="font-heading font-bold">Clienta piloto creada</p>
            <p>Estado: {result.profile?.status} · Aliada: {form.aliada_id ? "asignada" : "sin asignar"}</p>
            {result.invited && <p className="text-muted-foreground mt-1">Se envó invitación al correo.</p>}
            {form.force_prepared && <p className="text-muted-foreground">Cuenta marcada como preparada (active).</p>}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="email" required placeholder="Correo de la clienta piloto" value={form.email} onChange={(e) => set("email", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm" />
        <input type="text" required placeholder="Nombre completo" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm" />
        <input type="tel" placeholder="Teléfono" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm" />
        <select value={form.aliada_id} onChange={(e) => set("aliada_id", e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm bg-white">
          {aliadas.length === 0 && <option value="">Sin aliadas activas</option>}
          {aliadas.map((a) => <option key={a.id} value={a.id}>{a.public_name} ({a.aliada_code})</option>)}
        </select>
        <input type="text" required placeholder="Motivo (auditoría)" value={form.reason} onChange={(e) => set("reason", e.target.value)} className="sm:col-span-2 border border-input rounded-lg px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.send_invite} onChange={(e) => set("send_invite", e.target.checked)} className="w-4 h-4 accent-revive-green" />
          <span className="text-xs text-muted-foreground">Enviar invitación al correo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.force_prepared} onChange={(e) => set("force_prepared", e.target.checked)} className="w-4 h-4 accent-revive-green" />
          <span className="text-xs text-muted-foreground">Marcar como preparada (active) para pruebas</span>
        </label>
        <button type="submit" disabled={busy} className="sm:col-span-2 flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm py-3 rounded-xl hover:bg-revive-dark-mid disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Crear clienta piloto
        </button>
      </form>
    </div>
  );
}