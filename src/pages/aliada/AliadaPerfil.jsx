import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Save, User, Phone, Hash, BadgeCheck } from "lucide-react";

const STATUS_LABEL = { pending_training: "En capacitación", active: "Activa", suspended: "Suspendida", inactive: "Inactiva" };
const TRAINING_LABEL = { not_started: "No iniciada", in_progress: "En progreso", completed: "Completada" };

export default function AliadaPerfil() {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ public_name: "", whatsapp: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const aps = await base44.entities.AliadaProfile.filter({ user_id: me.id });
        const p = aps && aps[0];
        setProfile(p || null);
        setForm({ public_name: p?.public_name || "", whatsapp: p?.whatsapp || "" });
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [me]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await base44.entities.AliadaProfile.update(profile.id, { public_name: form.public_name.trim(), whatsapp: form.whatsapp.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Datos públicos y de contacto.</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-revive-green-pale flex items-center justify-center"><User className="w-6 h-6 text-revive-green" /></div>
          <div>
            <p className="font-heading font-bold text-revive-dark">{profile?.public_name || "Aliada"}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-revive-green bg-revive-green-pale px-2 py-0.5 rounded-full"><BadgeCheck className="w-3 h-3" /> Aliada Ser Vivo</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-revive-cream rounded-lg p-3">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase flex items-center gap-1"><Hash className="w-3 h-3" /> Código</p>
            <p className="font-mono font-bold text-revive-dark mt-0.5">{profile?.aliada_code || "—"}</p>
          </div>
          <div className="bg-revive-cream rounded-lg p-3">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Estado</p>
            <p className="font-heading font-bold text-revive-dark mt-0.5">{STATUS_LABEL[profile?.status] || profile?.status}</p>
          </div>
          <div className="bg-revive-cream rounded-lg p-3">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Capacitación</p>
            <p className="font-heading font-bold text-revive-dark mt-0.5">{TRAINING_LABEL[profile?.training_status] || profile?.training_status}</p>
          </div>
          {profile?.guidelines_accepted_at && (
            <div className="bg-revive-cream rounded-lg p-3">
              <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Lineamientos</p>
              <p className="font-heading font-bold text-revive-dark mt-0.5">{new Date(profile.guidelines_accepted_at).toLocaleDateString("es-MX")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-heading font-bold text-revive-dark text-sm">Editar datos de contacto</h2>
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Nombre público</label>
          <input value={form.public_name} onChange={(e) => setForm({ ...form, public_name: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+52 55 0000 0000" className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "Guardado ✓" : <><Save className="w-4 h-4" /> Guardar</>}
        </button>
      </div>
    </div>
  );
}