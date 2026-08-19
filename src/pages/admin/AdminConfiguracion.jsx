import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Save, Settings, Tag, ShieldCheck, UserCog } from "lucide-react";
import { EmptyState } from "@/components/admin/AdminUI";

const ROLES = [
  { key: "clienta", label: "Clienta" },
  { key: "aliada", label: "Aliada" },
  { key: "operaciones", label: "Operaciones" },
  { key: "contenidos", label: "Contenidos" },
  { key: "superadmin", label: "Superadmin" },
];

export default function AdminConfiguracion() {
  const [settings, setSettings] = useState(null);
  const [guides, setGuides] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const load = async () => {
    try {
      const [s, g, u] = await Promise.all([
        base44.entities.AppSettings.list(),
        base44.entities.IntensityGuide.list("sort_order", 50),
        base44.entities.User.list("-created_date", 200),
      ]);
      setSettings(s && s[0] || null);
      setGuides(g || []);
      setUsers(u || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      if (settings.id) await base44.entities.AppSettings.update(settings.id, settings);
      else await base44.entities.AppSettings.create(settings);
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2000);
      await load();
    } catch (e) { /* ignore */ }
    finally { setSavingSettings(false); }
  };

  const savePrice = async (g, price) => {
    try { await base44.entities.IntensityGuide.update(g.id, { price: Number(price) }); await load(); } catch (e) { /* ignore */ }
  };

  const changeRole = async (u, app_role) => {
    try { await base44.functions.invoke("setUserRole", { user_id: u.id, app_role }); await load(); } catch (e) { /* ignore */ }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Configuración</h1>
        <p className="text-sm text-muted-foreground">Precios, hora de corte, textos legales, correo de soporte y roles.</p>
      </div>

      {/* App settings */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-revive-green" /><h2 className="font-heading font-bold text-revive-dark text-sm">General</h2></div>
        {!settings ? <p className="text-sm text-muted-foreground">Crea el registro de configuración para comenzar.</p> : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Zona horaria</label><input value={settings.timezone || ""} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Corte semanal</label><input placeholder="domingo 20:00" value={settings.weekly_cutoff || ""} onChange={(e) => setSettings({ ...settings, weekly_cutoff: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">% video requerido</label><input type="number" value={settings.required_video_percent ?? 80} onChange={(e) => setSettings({ ...settings, required_video_percent: Number(e.target.value) })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Correo de soporte</label><input type="email" value={settings.support_email || ""} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Versión de términos</label><input value={settings.current_terms_version || ""} onChange={(e) => setSettings({ ...settings, current_terms_version: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <div><label className="text-xs font-heading font-semibold text-muted-foreground uppercase">Versión de privacidad</label><input value={settings.current_privacy_version || ""} onChange={(e) => setSettings({ ...settings, current_privacy_version: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm mt-1" /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.daily_summary_enabled || false} onChange={(e) => setSettings({ ...settings, daily_summary_enabled: e.target.checked })} /> Envío de resumen diario por correo</label>
          </div>
        )}
        <button onClick={saveSettings} disabled={savingSettings || !settings} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSettings ? "Guardado ✓" : <><Save className="w-4 h-4" /> Guardar configuración</>}
        </button>
      </div>

      {/* Prices */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-revive-green" /><h2 className="font-heading font-bold text-revive-dark text-sm">Precios de Kits</h2></div>
        {guides.length === 0 ? <p className="text-sm text-muted-foreground">Sin guías de intensidad.</p> : (
          <div className="space-y-2">
            {guides.map((g) => (
              <div key={g.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-heading font-semibold text-revive-dark">{g.name || g.intensity}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input type="number" defaultValue={g.price || 0} onBlur={(e) => savePrice(g, e.target.value)} className="w-24 border border-input rounded-lg px-2 py-1.5 text-sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><UserCog className="w-4 h-4 text-revive-green" /><h2 className="font-heading font-bold text-revive-dark text-sm">Roles</h2></div>
        {users.length === 0 ? <EmptyState icon={ShieldCheck} title="Sin usuarios" /> : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-revive-cream rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-heading font-semibold text-revive-dark truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.app_role}</p>
                </div>
                <select value={u.app_role || "clienta"} onChange={(e) => changeRole(u, e.target.value)} className="border border-input rounded-lg px-2 py-1.5 text-xs bg-white">
                  {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}