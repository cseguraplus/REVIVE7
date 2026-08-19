import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Heart, MessageCircle, Star } from "lucide-react";

export default function MiAliada() {
  const [profile, setProfile] = useState(null);
  const [aliada, setAliada] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const cps = await base44.entities.ClientaProfile.filter({ user_id: me.id });
        const p = cps && cps[0];
        setProfile(p || null);
        if (p?.aliada_id) {
          const res = await base44.functions.invoke('getMyAliadaContact', {});
          setAliada(res?.data?.aliada || null);
        }
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;

  const waLink = aliada?.whatsapp
    ? `https://wa.me/${String(aliada.whatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hola, soy clienta Revive 7 🌿")}`
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi Aliada</h1>
        <p className="text-sm text-muted-foreground">Tu acompañamiento cercano durante el programa.</p>
      </div>

      {aliada ? (
        <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-revive-green-pale flex items-center justify-center mx-auto">
            <Heart className="w-9 h-9 text-revive-green" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-revive-dark">{aliada.public_name || "Mi Aliada Ser Vivo"}</h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 text-revive-green" /> Aliada Ser Vivo</p>
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-6 py-3 rounded-full">
              <MessageCircle className="w-4 h-4" /> Escríbele por WhatsApp
            </a>
          )}
          <p className="text-xs text-muted-foreground">Tu aliada te acompaña, responde dudas y registra tu Kit acordado cada semana.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-3">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="font-heading font-bold text-revive-dark">Aún sin Aliada asignada</h2>
          <p className="text-sm text-muted-foreground">El equipo de operaciones te asignará una Aliada pronto. Si ya completaste tu preparación, pronto verás aquí su contacto.</p>
        </div>
      )}
    </div>
  );
}