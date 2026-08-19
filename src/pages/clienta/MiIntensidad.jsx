import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, MessageCircle } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

export default function MiIntensidad() {
  const [access, setAccess] = useState(null);
  const [guide, setGuide] = useState(null);
  const [guides, setGuides] = useState([]);
  const [profile, setProfile] = useState(null);
  const [choice, setChoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const [a, gs, cps] = await Promise.all([
          base44.functions.invoke("getDailyAccess", { clientaId: me.id }),
          base44.entities.IntensityGuide.filter({ active: true }),
          base44.entities.ClientaProfile.filter({ user_id: me.id }),
        ]);
        setAccess(a?.data || null);
        setGuides(gs || []);
        const p = cps && cps[0];
        setProfile(p || null);
        setChoice(p?.intensity_choice || null);
        const current = (a?.data?.current_intensity) || (p?.intensity_choice);
        const g = (gs || []).find((x) => x.intensity === current);
        setGuide(g || (gs || [])[0] || null);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const saveChoice = async () => {
    if (!profile || !choice) return;
    setSaving(true);
    try {
      await base44.entities.ClientaProfile.update(profile.id, { intensity_choice: choice });
      setSaved(true);
    } catch (e) { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Mi intensidad</h1>
        <p className="text-sm text-muted-foreground">Tu Kit de esta semana y tu preferencia para la siguiente.</p>
      </div>

      {guide && (
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-revive-green" />
            <div>
              <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Tu intensidad actual</p>
              <h2 className="font-heading font-bold text-xl text-revive-dark">{guide.name || INTENSITY_LABEL[guide.intensity]}</h2>
            </div>
          </div>
          {guide.description && <p className="text-sm text-muted-foreground leading-relaxed">{guide.description}</p>}
          {guide.instructions && (
            <div className="bg-revive-cream rounded-lg p-3 text-sm text-revive-dark/80 leading-relaxed">{guide.instructions}</div>
          )}
          {guide.general_recommendations && (
            <div>
              <p className="text-xs font-heading font-bold text-revive-dark uppercase mb-1">Recomendaciones</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{guide.general_recommendations}</p>
            </div>
          )}
          {guide.preventive_notices && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{guide.preventive_notices}</div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-heading font-bold text-revive-dark text-sm">Preferencia para la próxima semana</h2>
        <p className="text-xs text-muted-foreground">Tu aliada conversa contigo por WhatsApp y registra el Kit acordado. Tú puedes expresar tu preferencia:</p>
        <div className="grid grid-cols-1 gap-2">
          {guides.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((g) => {
            const active = choice === g.intensity;
            return (
              <button key={g.intensity} onClick={() => { setChoice(g.intensity); setSaved(false); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${active ? "bg-revive-green-pale border-revive-green" : "bg-white border-border"}`}>
                <div>
                  <p className="font-heading font-bold text-revive-dark text-sm">{g.name || INTENSITY_LABEL[g.intensity]}</p>
                  <p className="text-xs text-muted-foreground">{g.price ? `$${g.price} MXN` : ""}</p>
                </div>
                {active && <span className="text-revive-green font-heading font-bold text-xs">Elegida</span>}
              </button>
            );
          })}
        </div>
        <button onClick={saveChoice} disabled={saving || !choice}
          className="w-full bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "Preferencia guardada ✓" : "Guardar preferencia"}
        </button>
      </div>
    </div>
  );
}