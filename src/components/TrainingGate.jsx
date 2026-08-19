import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, GraduationCap, Lock } from "lucide-react";

// Bloquea el registro de clientas/ventas hasta completar la capacitación.
// Solo aplica si el usuario tiene AliadaProfile y training_status !== completed.
export default function TrainingGate({ children }) {
  const { user: me } = useAuth();
  const [state, setState] = useState("loading"); // loading | blocked | ok

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const role = me.app_role || (me.data && me.data.app_role);
        if (role !== "aliada") { setState("ok"); return; }
        const profiles = await base44.entities.AliadaProfile.filter({ user_id: me.id });
        const p = profiles && profiles[0];
        if (!p) { setState("ok"); return; }
        setState(p.training_status === "completed" ? "ok" : "blocked");
      } catch (e) { setState("ok"); }
    })();
  }, [me]);

  if (state === "loading") {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;
  }
  if (state === "blocked") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-revive-green-pale mb-5">
          <Lock className="w-8 h-8 text-revive-dark" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-revive-dark mb-2">Completa tu capacitación</h2>
        <p className="text-muted-foreground text-sm mb-6">Para registrar clientas y ventas debes terminar tu capacitación inicial, aceptar los lineamientos y aprobar la evaluación.</p>
        <Link to="/aliada/capacitacion" className="inline-flex items-center gap-2 bg-revive-dark text-white font-heading font-bold px-5 py-3 rounded-xl hover:bg-revive-dark-mid">
          <GraduationCap className="w-5 h-5" /> Ir a capacitación
        </Link>
      </div>
    );
  }
  return children;
}