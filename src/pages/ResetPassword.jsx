import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Revive7Logo from "@/components/Revive7Logo";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Supabase abre esta página ya con una sesión de recuperación activa (el
// enlace del correo trae el token en el fragmento de la URL; supabaseClient
// tiene detectSessionInUrl:true y la procesa automáticamente al cargar).
// No hace falta leer ningún parámetro de token manualmente.
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true); setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    } catch { setError("El enlace expiró o es inválido."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-revive-cream via-white to-revive-green-pale flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><div className="flex justify-center"><Revive7Logo size="lg" /></div></div>
        <div className="bg-white rounded-3xl border border-border shadow-lg p-8">
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-6">Nueva contraseña</h2>
          {done ? <p className="text-revive-green font-heading font-semibold text-center">¡Contraseña actualizada! Redirigiendo...</p> : (
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
              {[{ l: "Nueva contraseña", v: password, s: setPassword }, { l: "Confirmar contraseña", v: confirm, s: setConfirm }].map(({ l, v, s }) => (
                <div key={l}>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{l}</label>
                  <input type="password" required value={v} onChange={e => s(e.target.value)} placeholder="••••••••"
                    className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                </div>
              ))}
              <button type="submit" disabled={loading} className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}