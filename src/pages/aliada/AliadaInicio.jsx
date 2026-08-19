import React from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, Sparkles, Inbox, Package, ChevronRight } from "lucide-react";
import AliadaAlertCard from "@/components/aliada/AliadaAlertCard";
import { useBase44Query } from "@/hooks/useBase44Query";
import { buildAliadaAlertGroups } from "./aliadaAlertGroups";

export default function AliadaInicio() {
  const { data, isLoading, error } = useBase44Query("getAliadaDashboard", {});

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div><p className="font-heading font-semibold text-red-800">No se pudieron cargar tus datos</p><p className="text-sm text-red-700 mt-1">{/** @type {any} */ (error).response?.data?.error || error.message || "Error al cargar datos"}</p></div>
      </div>
    );
  }

  const { aliada_profile, clientas, using_simulated } = data;
  const { aliadaName, groups, prospectItems, inventoryItems, totalAlerts } = buildAliadaAlertGroups(data);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-revive-dark text-white rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-xl">A quién atender hoy</h1>
            <p className="text-white/70 text-sm truncate">{aliadaName} · Código <span className="font-mono text-revive-green-light">{aliada_profile?.aliada_code}</span>{using_simulated && <span className="ml-2 text-purple-300 text-xs">(modo prueba)</span>}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-heading font-bold text-revive-green-light">{totalAlerts}</p>
            <p className="text-xs text-white/60">Atender hoy</p>
          </div>
        </div>
      </div>

      {totalAlerts === 0 && (
        <div className="bg-white border border-border rounded-xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-revive-green mx-auto mb-2" />
          <p className="font-heading font-semibold text-revive-dark">Todo en orden hoy 🌿</p>
          <p className="text-sm text-muted-foreground mt-1">No hay alertas prioritarias. El contacto con tus clientas sigue siendo manual.</p>
        </div>
      )}

      {groups.map((g) => g.items.length > 0 && (
        <section key={g.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <g.icon className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">{g.title}</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{g.items.length}</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{g.hint}</p>
          <div className="space-y-3">
            {g.items.map(({ clienta: c, fecha, estado, message }) => (
              <AliadaAlertCard
                key={c.clienta_id || c.clienta_profile_id}
                nombre={c.full_name || `Clienta ${(c.clienta_id || "").slice(-6)}`}
                motivo={g.title}
                fecha={fecha}
                estado={estado}
                phone={c.phone}
                message={message}
              />
            ))}
          </div>
        </section>
      ))}

      {prospectItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">Prospectos con próxima acción vencida</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{prospectItems.length}</span>
          </div>
          <div className="space-y-3">
            {prospectItems.map((p, i) => <AliadaAlertCard key={i} {...p} />)}
          </div>
        </section>
      )}

      {inventoryItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-revive-dark" />
            <h2 className="font-heading font-bold text-revive-dark">Inventario bajo</h2>
            <span className="text-xs font-semibold bg-revive-green-pale text-revive-dark px-2 py-0.5 rounded-full">{inventoryItems.length}</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Solicita carga a Operaciones.</p>
          <div className="space-y-3">
            {inventoryItems.map((it, i) => <AliadaAlertCard key={i} {...it} />)}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/aliada/clientas" className="flex items-center justify-between gap-2 bg-white border border-border rounded-xl p-4 hover:bg-muted/40 transition-colors">
          <div><p className="font-heading font-semibold text-revive-dark text-sm">Mis clientas</p><p className="text-xs text-muted-foreground">{clientas.length} asignadas</p></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/aliada/prospectos" className="flex items-center justify-between gap-2 bg-white border border-border rounded-xl p-4 hover:bg-muted/40 transition-colors">
          <div><p className="font-heading font-semibold text-revive-dark text-sm">Prospectos</p><p className="text-xs text-muted-foreground">CRM</p></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
