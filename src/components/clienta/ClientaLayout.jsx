import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import Revive7Logo from "@/components/Revive7Logo";
import { Sun, Sparkles, TrendingUp, Activity, Zap, Heart, User } from "lucide-react";

const NAV = [
  { to: "/hoy", icon: Sun, label: "Hoy" },
  { to: "/preparacion", icon: Sparkles, label: "Preparación" },
  { to: "/progreso", icon: TrendingUp, label: "Progreso" },
  { to: "/indicadores", icon: Activity, label: "Indicadores" },
  { to: "/mi-intensidad", icon: Zap, label: "Intensidad" },
  { to: "/mi-aliada", icon: Heart, label: "Mi Aliada" },
  { to: "/cuenta", icon: User, label: "Cuenta" },
];

export default function ClientaLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-revive-cream flex flex-col">
      <header className="bg-white border-b border-border px-4 h-14 flex items-center justify-between sticky top-0 z-20">
        <Revive7Logo size="sm" />
        <span className="text-xs font-heading font-bold text-revive-dark/60">Revive 7</span>
      </header>

      <main className="flex-1 px-4 py-5 pb-28 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border">
        <div className="max-w-2xl mx-auto grid grid-cols-7">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${active ? "text-revive-green" : "text-muted-foreground"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-heading font-semibold leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}