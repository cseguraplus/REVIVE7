import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Link2, Copy, MessageCircle, Check } from "lucide-react";

export default function AliadaMiEnlace() {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const aps = await base44.entities.AliadaProfile.filter({ user_id: me.id });
        setProfile(aps && aps[0] || null);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [me]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  const slug = profile?.referral_slug || profile?.referral_code || profile?.aliada_code;
  const origin = typeof window !== "undefined" ? window.location.origin.replace("app.", "").replace("aliadasservivo", "revive7") : "https://revive7.mx";
  const url = slug ? `${origin}/?ref=${slug}` : `${origin}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { /* ignore */ }
  };

  const waShare = `https://wa.me/?text=${encodeURIComponent(`¡Te invito a comenzar Revive 7! 🌿 Conoce el método aquí: ${url}`)}`;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi enlace</h1>
        <p className="text-sm text-muted-foreground">Compártelo con tus prospectas. Quien se registre con tu enlace queda asignada a ti.</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-revive-green-pale flex items-center justify-center mx-auto">
          <Link2 className="w-8 h-8 text-revive-green" />
        </div>
        <div className="bg-revive-cream rounded-xl p-3 break-all text-sm font-mono text-revive-dark">{url}</div>
        {profile?.aliada_code && <p className="text-xs text-muted-foreground">Tu código: <span className="font-mono font-bold text-revive-dark">{profile.aliada_code}</span></p>}

        {slug && (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
            alt="QR de mi enlace"
            className="w-44 h-44 mx-auto rounded-xl border border-border"
          />
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold py-3 rounded-xl">
            {copied ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
          </button>
          <a href={waShare} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl">
            <MessageCircle className="w-4 h-4" /> Compartir por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}