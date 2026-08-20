// Home por app_role — compartido entre RoleRouter (login) y RoleGuard (protección de rutas).
export const ROLE_HOME = {
  superadmin: "/admin",
  operaciones: "/admin/operaciones",
  contenidos: "/admin/contenido",
  aliada: "/aliada/inicio",
  clienta: "/hoy",
};

export function resolveAppRole(user) {
  return (user && (user.app_role || (user.data && user.data.app_role))) || "clienta";
}
