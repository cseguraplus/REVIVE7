import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, FlaskConical, RotateCcw, CalendarDays, CalendarOff, Flag } from "lucide-react";
import PilotAliendaForm from "@/components/admin/PilotAliadaForm";
import PilotClientaForm from "@/components/admin/PilotClientaForm";
import PilotVideoPanel from "@/components/admin/PilotVideoPanel";

function addDaysISO(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export default function AdminPrueba() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [testControl, setTestControl] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const all = await base44.entities.User.list();
    const pilots = (all || []).filter((u) => u.is_test_account);
    setUsers(pilots);
    if (pilots.length && !selectedId) setSelectedId(pilots[0].id);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const loadAccount = async (id) => {
    if (!id) { setTestControl(null); setStartDate(null); return; }
    const [tcs, enrolls] = await Promise.all([
      base44.entities.TestControl.filter({ user_id: id }),
      base44.entities.Enrollment.filter({ clienta_id: id, status: "active" }),
    ]);
    setTestControl(tcs && tcs[0] ? tcs[0] : null);
    const enr = enrolls && enrolls[0];
    let start = enr?.start_date || null;
    if (enr?.generation_id) {
      try {
        const gen = await base44.entities.Generation.get(enr.generation_id);
        if (gen?.start_date) start = gen.start_date;
      } catch (e) { /* ignore */ }
    }
    setStartDate(start);
  };

  useEffect(() => { loadAccount(selectedId); }, [selectedId]);

  const run = async (fn, payload, label) => {
    setBusy(true); setError(null); setMsg(null);
    try {
      const res = await fn(payload);
      setMsg(label);
      await loadAccount(selectedId);
      return res;
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      throw e;
    } finally { setBusy(false); }
  };

  const setControl = (payload) => run((p) => base44.functions.invoke("setTestControl", p), payload, "Reloj actualizado");

  const handleDay = (n) => {
    if (!startDate) { setError("La clienta no tiene inscripción activa con fecha de inicio."); return; }
    if (!reason.trim()) { setError("Motivo obligatorio para forzar un avance."); return; }
    const dt = `${addDaysISO(startDate, n - 1)}T08:00:00`;
    setControl({ user_id: selectedId, enabled: true, effective_datetime: dt, allow_reset: true, reason: `Forzar día ${n}: ${reason.trim()}` });
  };

  const handleReal = () => {
    setControl({ user_id: selectedId, enabled: false, effective_datetime: null, allow_reset: false, reason: "Fecha real (deshabilitar simulación)" });
  };

  const handleReset = async () => {
    if (!reason.trim()) { setError("Motivo obligatorio para reiniciar el progreso."); return; }
    try {
      await run((p) => base44.functions.invoke("resetPilotUser", p), { clienta_id: selectedId, reason: reason.trim() }, "Progreso reiniciado");
    } catch (e) { /* error shown */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-revive-green" />
      </div>
    );
  }

  const effectiveDisplay = testControl?.enabled ? testControl.effective_datetime : "Fecha real";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-6 h-6 text-revive-green" />
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Cuenta piloto segura</h1>
          <p className="text-muted-foreground text-sm mt-1">Solo superadmin. La fecha simulada afecta únicamente a cuentas con is_test_account=true.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {msg && (
        <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-4 text-sm text-revive-dark font-heading font-semibold">
          {msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Cuenta piloto</label>
          <select value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value)} disabled={users.length === 0}
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
            {users.length === 0 && <option value="">Sin cuentas piloto (is_test_account)</option>}
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-revive-cream rounded-xl p-4">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Fecha efectiva</p>
            <p className="font-heading font-bold text-revive-dark mt-1">{effectiveDisplay}</p>
          </div>
          <div className="bg-revive-cream rounded-xl p-4">
            <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">Inicio del programa</p>
            <p className="font-heading font-bold text-revive-dark mt-1">{startDate || "Sin inscripción"}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Motivo (obligatorio para forzar avance o reiniciar)</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Por qué adelantas o reinicias?"
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => handleDay(1)} disabled={busy || !startDate} className="flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm py-3 rounded-xl hover:bg-revive-dark-mid disabled:opacity-50">
            <Flag className="w-4 h-4" /> Día 1
          </button>
          <button onClick={() => handleDay(2)} disabled={busy || !startDate} className="flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold text-sm py-3 rounded-xl hover:bg-revive-dark-mid disabled:opacity-50">
            <CalendarDays className="w-4 h-4" /> Día 2
          </button>
          <button onClick={handleReal} disabled={busy} className="flex items-center justify-center gap-2 bg-white border border-border text-revive-dark font-heading font-bold text-sm py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            <CalendarOff className="w-4 h-4" /> Fecha real
          </button>
          <button onClick={handleReset} disabled={busy} className="flex items-center justify-center gap-2 bg-red-600 text-white font-heading font-bold text-sm py-3 rounded-xl hover:bg-red-700 disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Reiniciar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Cada acción registra un AuditLog. El reinicio y el avance forzado exigen motivo.</p>
      </div>

      <PilotAliendaForm />
      <PilotClientaForm />
      <PilotVideoPanel />
    </div>
  );
}