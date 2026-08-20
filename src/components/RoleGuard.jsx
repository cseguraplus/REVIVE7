import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ROLE_HOME, resolveAppRole } from "@/lib/roleHome";

// Segunda capa de protección, cosmética: la protección real vive en el backend
// (RLS de entidades + auth obligatoria en funciones). Este guard evita que el
// contenido de una sección se renderice, aunque sea un instante, para un
// usuario autenticado cuyo app_role no corresponde a esa sección — antes,
// AppLayout recibía el rol como prop hardcodeada por ruta sin verificarlo.
export default function RoleGuard({ allowedRoles }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const appRole = resolveAppRole(user);
  if (!allowedRoles.includes(appRole)) {
    return <Navigate to={ROLE_HOME[appRole] || "/login"} replace />;
  }

  return <Outlet />;
}
