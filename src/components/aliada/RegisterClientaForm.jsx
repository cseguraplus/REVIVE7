import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, UserPlus, X, AlertCircle, CheckCircle2, Lock } from "lucide-react";

export default function RegisterClientaForm({ onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", terms_accepted: false, privacy_accepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.terms_accepted || !form.privacy_accepted) { setError("Debes confirmar que la clienta aceptó términos y privacidad."); return; }
    setBusy(true); setError(null); setSuccess(null);
    try {
      await base44.functions.invoke("registerClienta", form);
      setSuccess("Clienta registrada. Le enviamos un enlace para crear su contraseña.");
      setForm({ full_name: "", email: "", phone: "", terms_accepted: false, privacy_accepted: false });
      if (onDone) setTimeout(() => { onDone(); setOpen(false); setSuccess(null); }, 1500);
    } catch (err) { setError(err?.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-dark-mid">
        <UserPlus className="w-4 h-4" /> Registrar clienta
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-revive-dark">Registrar clienta</h2>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="flex items-start gap-2 bg-revive-cream rounded-xl p-3 mb-4">
              <Lock className="w-4 h-4 text-revive-dark mt-0.5" />
              <p className="text-xs text-revive-dark">No creas ni conoces la contraseña de la clienta. Le enviaremos un enlace para que ella la defina.</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 mb-3"><AlertCircle className="w-4 h-4 text-red-600 mt-0.5" /><p className="text-xs text-red-700">{error}</p></div>}
            {success && <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-3 flex items-start gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-revive-dark mt-0.5" /><p className="text-xs text-revive-dark">{success}</p></div>}
            <form onSubmit={submit} className="space-y-3">
              <input required placeholder="Nombre completo" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
              <input required type="email" placeholder="Correo" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
              <input required type="tel" placeholder="Teléfono" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.terms_accepted} onChange={(e) => set("terms_accepted", e.target.checked)} className="w-4 h-4 mt-0.5 accent-revive-green" />
                <span className="text-xs text-muted-foreground">La clienta aceptó los <b>Términos y condiciones</b>.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.privacy_accepted} onChange={(e) => set("privacy_accepted", e.target.checked)} className="w-4 h-4 mt-0.5 accent-revive-green" />
                <span className="text-xs text-muted-foreground">La clienta aceptó el <b>Aviso de privacidad</b>.</span>
              </label>
              <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm py-3 rounded-xl disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Registrar y enviar enlace
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}