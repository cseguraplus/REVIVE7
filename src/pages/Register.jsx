import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import Revive7Logo from "@/components/Revive7Logo";
import GoogleIcon from "@/components/GoogleIcon";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState("register");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submitRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }
    if (!acceptTerms || !acceptPrivacy) { setError("Debes aceptar los Términos y el Aviso de Privacidad."); return; }
    setLoading(true); setError("");
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      setStep("otp");
    } catch (err) {
      const real = err?.response?.data?.message || err?.message || (typeof err === "string" ? err : "");
      setError(`Error al registrar. ${real || "Revisa los datos e intenta de nuevo."}`);
    } finally { setLoading(false); }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { access_token } = await base44.auth.verifyOtp({ email: form.email, otpCode: otp });
      base44.auth.setToken(access_token);
      // full_name es un campo built-in que updateMe no puede sobreescribir; se omite para no lanzar error.
      // El guardado de perfil es best-effort: el token ya quedó seteado y el redirect no debe bloquearse.
      try {
        const now = new Date().toISOString();
        await base44.auth.updateMe({
          phone: form.phone,
          terms_accepted_at: now,
          privacy_accepted_at: now,
        });
      } catch (e) { /* best-effort */ }
      window.location.href = "/dashboard";
    } catch (err) {
      const real = err?.response?.data?.message || err?.message || "";
      setError(real ? `Código incorrecto o expirado. ${real}` : "Código incorrecto. Inténtalo de nuevo.");
    } finally { setLoading(false); }
  };

  const googleRegister = () => base44.auth.loginWithProvider("google", "/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-revive-cream via-white to-revive-green-pale flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Revive7Logo size="lg" /></div>
          <p className="text-muted-foreground text-sm">Crea tu cuenta de clienta Revive 7</p>
        </div>
        <div className="bg-white rounded-3xl border border-border shadow-lg p-8">
          <h2 className="font-heading font-bold text-xl text-revive-dark mb-2">{step === "otp" ? "Verificar email" : "Crear cuenta"}</h2>
          {step === "otp" && <p className="text-muted-foreground text-sm mb-6">Ingresa el código que enviamos a {form.email}</p>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}

          {step === "register" ? (
            <>
              <form onSubmit={submitRegister} className="space-y-4">
                <Field label="Nombre completo" value={form.full_name} onChange={v => set("full_name", v)} placeholder="Ana García" />
                <Field label="Correo electrónico" type="email" value={form.email} onChange={v => set("email", v)} placeholder="tu@email.com" />
                <Field label="Teléfono" type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="55 1234 5678" />
                <div>
                  <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} required value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••"
                      className="w-full border border-input rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-revive-dark">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Field label="Confirmar contraseña" type={showPass ? "text" : "password"} value={form.confirm} onChange={v => set("confirm", v)} placeholder="••••••••" />

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-revive-green" />
                    <span className="text-xs text-muted-foreground">Acepto los <span className="text-revive-green font-semibold underline">Términos y Condiciones</span></span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 accent-revive-green" />
                    <span className="text-xs text-muted-foreground">Acepto el <span className="text-revive-green font-semibold underline">Aviso de Privacidad</span></span>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl hover:bg-revive-dark-mid transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
                </button>
              </form>
              <Divider />
              <button onClick={googleRegister} className="w-full border border-input bg-white text-revive-dark font-heading font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <GoogleIcon /> Registrarme con Google
              </button>
            </>
          ) : (
            <form onSubmit={submitOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Código de verificación</label>
                <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000"
                  className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 text-center text-2xl tracking-widest" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-revive-dark text-white font-heading font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
              </button>
              <button type="button" onClick={() => base44.auth.resendOtp(form.email)} className="w-full text-sm text-revive-green font-heading font-semibold hover:underline">
                Reenviar código
              </button>
            </form>
          )}
        </div>
        <p className="text-center mt-6 text-xs text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="text-revive-green font-heading font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-5 text-center">
      <span className="bg-white px-3 text-xs text-muted-foreground relative z-10">o</span>
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
    </div>
  );
}