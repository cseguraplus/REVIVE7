import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Users, CalendarDays, BookOpen, ClipboardList, Rocket } from "lucide-react";

// Seed console preserved from the previous MVP — creates test data (users, generation, program days, enrollment).
export default function SeedConsole() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [vimeoIds, setVimeoIds] = useState({ bienvenida: "VIMEO_ID_BIENVENIDA", dia_1: "VIMEO_ID_DIA_1", dia_2: "VIMEO_ID_DIA_2" });
  const [loading, setLoading] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSeed = async (action) => {
    setLoading(action); setError(null); setResults(null);
    try {
      const response = await base44.functions.invoke("seedTestData", { action, start_date: startDate, vimeo_ids: vimeoIds });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error desconocido");
    } finally { setLoading(null); }
  };

  const SeedCard = ({ icon: Icon, title, description, action, children }) => (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-revive-green-pale flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-revive-dark" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-revive-dark">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
      <Button onClick={() => runSeed(action)} disabled={loading !== null} className="w-full bg-revive-dark hover:bg-revive-dark-mid text-white font-heading font-semibold">
        {loading === action ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : `Ejecutar: ${title}`}
      </Button>
    </div>
  );

  return (
    <details className="bg-white border border-border rounded-xl p-5">
      <summary className="cursor-pointer font-heading font-semibold text-revive-dark flex items-center gap-2">
        <Rocket className="w-5 h-5 text-revive-green" /> Datos semilla (MVP)
      </summary>
      <div className="space-y-5 mt-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Invita usuarios reales por email y crea datos persistentes. Usa los botones individuales o "Sembrar Todo".</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-5 space-y-3">
          <Label className="font-heading font-semibold text-revive-dark">Fecha de inicio (editable)</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-xs" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <SeedCard icon={Users} title="Usuarios de prueba" description="Invita superadmin, aliada y clienta." action="users" />
          <SeedCard icon={CalendarDays} title="Generación Piloto 7" description="Generación de 7 días desde la fecha de inicio." action="generation" />
          <SeedCard icon={BookOpen} title="3 ProgramDays" description="Días 0, 1 y 2 publicados." action="program_days">
            <div className="space-y-2">
              {["bienvenida", "dia_1", "dia_2"].map((k) => (
                <div key={k}>
                  <Label className="text-xs">Vimeo ID — {k}</Label>
                  <Input value={vimeoIds[k]} onChange={(e) => setVimeoIds({ ...vimeoIds, [k]: e.target.value })} className="font-mono text-sm" />
                </div>
              ))}
            </div>
          </SeedCard>
          <SeedCard icon={ClipboardList} title="Enrollment" description="Enrollment activo para la clienta de prueba." action="enrollment" />
        </div>
        <Button onClick={() => runSeed("all")} disabled={loading !== null} className="w-full bg-revive-green hover:bg-revive-green-light text-revive-dark font-heading font-bold text-lg py-6">
          {loading === "all" ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sembrando...</> : <><Rocket className="w-5 h-5 mr-2" /> Sembrar Todo</>}
        </Button>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {results && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><p className="font-heading font-semibold text-green-800">Sembrado completado</p></div>
            <pre className="text-xs bg-white border border-green-100 rounded-lg p-3 overflow-auto max-h-96 font-mono">{JSON.stringify(results.results || results, null, 2)}</pre>
          </div>
        )}
      </div>
    </details>
  );
}