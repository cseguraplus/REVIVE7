import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, BookOpen } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

export default function AliadaMateriales() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.IntensityGuide.filter({ active: true })
      .then((g) => setGuides((g || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Materiales</h1>
        <p className="text-sm text-muted-foreground">Contenido para explicar los Kits a tus clientas y prospectos.</p>
      </div>

      {guides.map((g) => (
        <div key={g.id} className="bg-white border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-revive-green" />
            <h2 className="font-heading font-bold text-lg text-revive-dark">{g.name || INTENSITY_LABEL[g.intensity]}</h2>
            {g.price ? <span className="ml-auto text-sm font-heading font-bold text-revive-green">${g.price} MXN</span> : null}
          </div>
          {g.description && <p className="text-sm text-muted-foreground leading-relaxed">{g.description}</p>}
          {g.instructions && (
            <div className="bg-revive-cream rounded-lg p-3">
              <p className="text-xs font-heading font-bold text-revive-dark uppercase mb-1 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Instrucciones</p>
              <p className="text-sm text-revive-dark/80 leading-relaxed">{g.instructions}</p>
            </div>
          )}
          {g.general_recommendations && (
            <div>
              <p className="text-xs font-heading font-bold text-revive-dark uppercase mb-1">Recomendaciones</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{g.general_recommendations}</p>
            </div>
          )}
          {g.daily_packs && (
            <div>
              <p className="text-xs font-heading font-bold text-revive-dark uppercase mb-1">DailyPacks</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{g.daily_packs}</p>
            </div>
          )}
          {g.preventive_notices && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{g.preventive_notices}</div>}
        </div>
      ))}
    </div>
  );
}