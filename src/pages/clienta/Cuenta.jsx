import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, LogOut, Mail, Shield, User } from "lucide-react";

export default function Cuenta() {
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await base44.auth.me();
        setMe(m);
        const cps = await base44.entities.ClientaProfile.filter({ user_id: m.id });
        setProfile(cps && cps[0] || null);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleLogout = () => base44.auth.logout("/");

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">Datos y preferencias de tu perfil.</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-revive-green-pale flex items-center justify-center">
            <User className="w-6 h-6 text-revive-green" />
          </div>
          <div>
            <p className="font-heading font-bold text-revive-dark">{me?.full_name || "Clienta Revive 7"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {me?.email}</p>
          </div>
        </div>
        {profile?.phone && (
          <div className="text-sm text-muted-foreground">Teléfono: <span className="text-revive-dark font-heading font-semibold">{profile.phone}</span></div>
        )}
        {profile?.status && (
          <div className="text-sm text-muted-foreground">Estado del programa: <span className="text-revive-dark font-heading font-semibold capitalize">{profile.status}</span></div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-heading font-bold text-revive-dark text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-revive-green" /> Privacidad y términos</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Términos aceptados: <span className="text-revive-dark font-semibold">{profile?.terms_accepted_at ? new Date(profile.terms_accepted_at).toLocaleDateString("es-MX") : "—"}</span></p>
          <p>Privacidad aceptada: <span className="text-revive-dark font-semibold">{profile?.privacy_accepted_at ? new Date(profile.privacy_accepted_at).toLocaleDateString("es-MX") : "—"}</span></p>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-white border border-border text-revive-dark font-heading font-bold py-3 rounded-xl hover:bg-muted/50">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </div>
  );
}