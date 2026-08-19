import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import Revive7Logo from "@/components/Revive7Logo";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch {}
    setSent(true); setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-revive-cream via-white to-revive-green-pale flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><div className="flex justify-center"><Revive7Logo size="lg" /></div></div>
        <div className="bg-white rounded-3xl border border-border shadow-lg p-8">
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-2">Recuperar contraseña</h2>
          {sent ? (
            <p className="text-muted-foreground text-sm">Si ese correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Correo electrónico</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
                  className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar instrucciones"}
              </button>
            </form>
          )}
        </div>
        <p className="text-center mt-6 text-xs text-muted-foreground">
          <Link to="/login" className="text-revive-green font-heading font-semibold hover:underline">← Volver al login</Link>
        </p>
      </div>
    </div>
  );
}