import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, Users } from "lucide-react";
import AliadaClientaCard from "@/components/aliada/AliadaClientaCard";
import RegisterClientaForm from "@/components/aliada/RegisterClientaForm";

const statusOrder = { active: 0, pending: 1, paused: 2, completed: 3, dropped: 4 };

export default function AliadaClientas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = () => {
    setLoading(true);
    base44.functions.invoke("getAliadaDashboard", {})
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || err.message || "Error al cargar datos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-revive-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-semibold text-red-800">No se pudieron cargar tus clientas</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { aliada_profile, clientas } = data;
  const aliadaName = aliada_profile?.public_name || "tu aliada";
  const sorted = [...clientas].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Mis clientas</h1>
          <p className="text-sm text-muted-foreground">{clientas.length} asignadas · vista de solo lectura</p>
        </div>
        <RegisterClientaForm onDone={reload} />
      </div>

      {clientas.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tienes clientas asignadas todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <AliadaClientaCard key={c.clienta_id || c.clienta_profile_id} clienta={c} aliadaName={aliadaName} />
          ))}
        </div>
      )}
    </div>
  );
}