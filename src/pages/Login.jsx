import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Revive7Logo from "@/components/Revive7Logo";
import GoogleIcon from "@/components/GoogleIcon";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Correo o contraseña incorrectos. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const googleLogin = () => supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-revive-cream via-white to-revive-green-pale flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Revive7Logo size="lg" /></div>
          <p className="text-muted-foreground text-sm">Accede a tu plataforma de transformación</p>
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-lg p-8">
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Correo electrónico</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-input rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-revive-dark">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-revive-green font-heading font-semibold hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl hover:bg-revive-dark-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </button>
          </form>

          <div className="relative my-5 text-center">
            <span className="bg-white px-3 text-xs text-muted-foreground relative z-10">o</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <button onClick={googleLogin} className="w-full border border-input bg-white text-revive-dark font-heading font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <GoogleIcon /> Entrar con Google
          </button>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            ¿Eres clienta nueva?{" "}
            <Link to="/register" className="text-revive-green font-heading font-semibold hover:underline">Crea tu cuenta</Link>
          </p>
          <p className="text-xs text-muted-foreground">
            ¿Quieres ser Aliada Ser Vivo?{" "}
            <Link to="/aliadas" className="text-revive-green font-heading font-semibold hover:underline">Aplica aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}