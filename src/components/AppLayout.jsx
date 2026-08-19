import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Revive7Logo from "@/components/Revive7Logo";
import {
  LayoutDashboard, Users, ShoppingBag, Package, BookOpen,
  BarChart3, LogOut, Menu, X, Star, Sparkles, Inbox, Settings, Database, FlaskConical,
  CalendarDays, GraduationCap, Bell, ScrollText, Plug
} from "lucide-react";

const superadminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/aliadas", icon: Star, label: "Aliadas" },
  { to: "/admin/clientas", icon: Users, label: "Clientas" },
  { to: "/admin/generaciones", icon: CalendarDays, label: "Generaciones" },
  { to: "/admin/compras", icon: ShoppingBag, label: "Ventas" },
  { to: "/admin/kits", icon: Package, label: "Inventario" },
  { to: "/admin/contenido", icon: BookOpen, label: "Contenido" },
  { to: "/admin/capacitacion", icon: GraduationCap, label: "Capacitación" },
  { to: "/admin/alertas", icon: Bell, label: "Alertas y solicitudes" },
  { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
  { to: "/admin/configuracion", icon: Settings, label: "Configuración" },
  { to: "/admin/auditoria", icon: ScrollText, label: "Auditoría" },
  { to: "/admin/integraciones", icon: Plug, label: "Integraciones" },
  { to: "/admin/prueba", icon: FlaskConical, label: "Prueba" },
];

const operacionesNav = [
  { to: "/admin/operaciones", icon: Settings, label: "Panel" },
  { to: "/admin/aliadas", icon: Star, label: "Aliadas" },
  { to: "/admin/clientas", icon: Users, label: "Clientas" },
  { to: "/admin/generaciones", icon: CalendarDays, label: "Generaciones" },
  { to: "/admin/compras", icon: ShoppingBag, label: "Ventas" },
  { to: "/admin/kits", icon: Package, label: "Inventario" },
  { to: "/admin/alertas", icon: Bell, label: "Alertas y solicitudes" },
  { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
];

const contenidosNav = [
  { to: "/admin/contenido", icon: BookOpen, label: "Contenido" },
  { to: "/admin/capacitacion", icon: GraduationCap, label: "Capacitación" },
];

const aliadaNav = [
  { to: "/aliada/inicio", icon: LayoutDashboard, label: "Inicio" },
  { to: "/aliada/clientas", icon: Users, label: "Clientas" },
  { to: "/aliada/prospectos", icon: Inbox, label: "Prospectos" },
  { to: "/aliada/ventas", icon: ShoppingBag, label: "Ventas" },
  { to: "/aliada/inventario", icon: Package, label: "Inventario" },
  { to: "/aliada/capacitacion", icon: BookOpen, label: "Capacitación" },
  { to: "/aliada/materiales", icon: Sparkles, label: "Materiales" },
  { to: "/aliada/mi-enlace", icon: Star, label: "Mi enlace" },
  { to: "/aliada/perfil", icon: Settings, label: "Perfil" },
];

const clientaNav = [
  { to: "/preparacion", icon: Sparkles, label: "Preparación" },
  { to: "/hoy", icon: LayoutDashboard, label: "Hoy" },
  { to: "/programa", icon: BookOpen, label: "Mi Programa" },
  { to: "/programa/progreso", icon: BarChart3, label: "Mi Progreso" },
];

const navByAppRole = {
  superadmin: superadminNav,
  operaciones: operacionesNav,
  contenidos: contenidosNav,
  aliada: aliadaNav,
  clienta: clientaNav,
};

export default function AppLayout({ role = "admin" }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const appRole = (user && (user.app_role || (user.data && user.data.app_role))) || role;

  const nav = navByAppRole[appRole] || (role === "aliada" ? aliadaNav : role === "clienta" ? clientaNav : operacionesNav);

  const handleLogout = () => base44.auth.logout("/");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-revive-dark flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-5 border-b border-white/10">
          <Revive7Logo dark size="sm" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== "/admin" && to !== "/vendedora" && to !== "/programa" && to !== "/aliada/inicio" && to !== "/hoy" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-heading font-semibold transition-colors ${active ? "bg-revive-green text-revive-dark" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-heading font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-border px-4 h-14 flex items-center gap-4 sticky top-0 z-20 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-revive-dark">
            <Menu className="w-5 h-5" />
          </button>
          <Revive7Logo size="sm" />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}