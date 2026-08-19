import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Public landings
import LandingClientas from './pages/LandingClientas';
import LandingAliadas from './pages/LandingAliadas';

// Role router
import RoleRouter from './pages/RoleRouter';

// Admin
import AppLayout from './components/AppLayout';
import ClientaLayout from './components/clienta/ClientaLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendedoras from './pages/admin/AdminVendedoras';
import AdminClientas from './pages/admin/AdminClientas';
import AdminCompras from './pages/admin/AdminCompras';
import AdminKits from './pages/admin/AdminKits';
import AdminContenido from './pages/admin/AdminContenido';
import AdminReportes from './pages/admin/AdminReportes';

// Vendedora
import VendedoraDashboard from './pages/vendedora/VendedoraDashboard';
import VendedoraClientas from './pages/vendedora/VendedoraClientas';
import VendedoraCompras from './pages/vendedora/VendedoraCompras';

// Clienta
import Hoy from './pages/clienta/Hoy';
import Progreso from './pages/clienta/Progreso';
import Indicadores from './pages/clienta/Indicadores';
import MiIntensidad from './pages/clienta/MiIntensidad';
import MiAliada from './pages/clienta/MiAliada';
import Cuenta from './pages/clienta/Cuenta';

// Aliada
import AliadaInicio from './pages/aliada/AliadaInicio';
import AliadaClientas from './pages/aliada/AliadaClientas';
import AliadaProspectos from './pages/aliada/AliadaProspectos';
import AliadaVentas from './pages/aliada/AliadaVentas';
import AliadaInventario from './pages/aliada/AliadaInventario';
import AliadaCapacitacion from './pages/aliada/AliadaCapacitacion';
import AliadaMateriales from './pages/aliada/AliadaMateriales';
import AliadaMiEnlace from './pages/aliada/AliadaMiEnlace';
import AliadaPerfil from './pages/aliada/AliadaPerfil';
import Preparacion from './pages/clienta/Preparacion';

// Admin MVP
import AdminOperaciones from './pages/admin/AdminOperaciones';
import AdminPrueba from './pages/admin/AdminPrueba';
import AdminLeads from './pages/admin/AdminLeads';
import AdminAliadas from './pages/admin/AdminAliadas';
import AdminDataModel from './pages/admin/AdminDataModel';
import AdminGeneraciones from './pages/admin/AdminGeneraciones';
import AdminCapacitacion from './pages/admin/AdminCapacitacion';
import AdminAlertas from './pages/admin/AdminAlertas';
import AdminConfiguracion from './pages/admin/AdminConfiguracion';
import AdminAuditoria from './pages/admin/AdminAuditoria';
import AdminIntegraciones from './pages/admin/AdminIntegraciones';
import Onboarding from './pages/Onboarding';

import ProtectedRoute from '@/components/ProtectedRoute';
import TrainingGate from '@/components/TrainingGate';

const getDomainSite = () => {
  try {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('aliadaservivo')) return 'aliadas'; // aliadaservivo.com
    if (host.includes('apprevive7')) return 'app';          // apprevive7.mx
    return 'revive7';                                       // revive7.mx (default)
  } catch { return 'revive7'; }
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const site = getDomainSite();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={site === 'aliadas' ? <LandingAliadas /> : site === 'app' ? <Navigate to="/dashboard" replace /> : <LandingClientas />} />
      <Route path="/aliadas" element={site === 'aliadas' ? <LandingAliadas /> : <Navigate to="/" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected — role router */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/dashboard" element={<RoleRouter />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Admin */}
        <Route element={<AppLayout role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/vendedoras" element={<AdminVendedoras />} />
          <Route path="/admin/clientas" element={<AdminClientas />} />
          <Route path="/admin/compras" element={<AdminCompras />} />
          <Route path="/admin/kits" element={<AdminKits />} />
          <Route path="/admin/contenido" element={<AdminContenido />} />
          <Route path="/admin/generaciones" element={<AdminGeneraciones />} />
          <Route path="/admin/capacitacion" element={<AdminCapacitacion />} />
          <Route path="/admin/alertas" element={<AdminAlertas />} />
          <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
          <Route path="/admin/auditoria" element={<AdminAuditoria />} />
          <Route path="/admin/integraciones" element={<AdminIntegraciones />} />
          <Route path="/admin/reportes" element={<AdminReportes />} />
          <Route path="/admin/operaciones" element={<AdminOperaciones />} />
          <Route path="/admin/prueba" element={<AdminPrueba />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/data-model" element={<AdminDataModel />} />
          <Route path="/admin/aliadas" element={<AdminAliadas />} />
        </Route>

        {/* Vendedora */}
        <Route element={<AppLayout role="vendedora" />}>
          <Route path="/vendedora" element={<VendedoraDashboard />} />
          <Route path="/vendedora/clientas" element={<TrainingGate><VendedoraClientas /></TrainingGate>} />
          <Route path="/vendedora/compras" element={<TrainingGate><VendedoraCompras /></TrainingGate>} />
        </Route>

        {/* Aliada */}
        <Route element={<AppLayout role="aliada" />}>
          <Route path="/aliada/inicio" element={<AliadaInicio />} />
          <Route path="/aliada/clientas" element={<TrainingGate><AliadaClientas /></TrainingGate>} />
          <Route path="/aliada/prospectos" element={<AliadaProspectos />} />
          <Route path="/aliada/ventas" element={<TrainingGate><AliadaVentas /></TrainingGate>} />
          <Route path="/aliada/inventario" element={<AliadaInventario />} />
          <Route path="/aliada/capacitacion" element={<AliadaCapacitacion />} />
          <Route path="/aliada/materiales" element={<AliadaMateriales />} />
          <Route path="/aliada/mi-enlace" element={<AliadaMiEnlace />} />
          <Route path="/aliada/perfil" element={<AliadaPerfil />} />
        </Route>

        {/* Clienta */}
        <Route element={<ClientaLayout />}>
          <Route path="/hoy" element={<Hoy />} />
          <Route path="/preparacion" element={<Preparacion />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/indicadores" element={<Indicadores />} />
          <Route path="/mi-intensidad" element={<MiIntensidad />} />
          <Route path="/mi-aliada" element={<MiAliada />} />
          <Route path="/cuenta" element={<Cuenta />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;