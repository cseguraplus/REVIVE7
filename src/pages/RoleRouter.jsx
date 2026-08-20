import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ROLE_HOME, resolveAppRole } from "@/lib/roleHome";

export default function RoleRouter() {
  const { user: me } = useAuth();
  const [state, setState] = useState({ loading: true, redirect: null });

  useEffect(() => {
    if (!me) { setState({ loading: false, redirect: "/login" }); return; }
    (async () => {
      try {
        const appRole = resolveAppRole(me);
        const onboardingDone = (me.onboarding_status || (me.data && me.data.onboarding_status)) === "completed";

        let profileComplete = true;
        if (appRole === "clienta") {
          const cps = await base44.entities.ClientaProfile.filter({ user_id: me.id });
          profileComplete = !!(cps && cps.length > 0);
        } else if (appRole === "aliada") {
          const aps = await base44.entities.AliadaProfile.filter({ user_id: me.id });
          profileComplete = !!(aps && aps.length > 0);
        }

        if (!onboardingDone || !profileComplete) {
          setState({ loading: false, redirect: "/onboarding" });
        } else {
          setState({ loading: false, redirect: ROLE_HOME[appRole] || "/hoy" });
        }
      } catch {
        setState({ loading: false, redirect: "/login" });
      }
    })();
  }, [me]);

  if (state.loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={state.redirect} replace />;
}