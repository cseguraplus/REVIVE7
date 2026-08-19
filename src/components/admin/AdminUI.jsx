import React, { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Loader2, X } from "lucide-react";

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="bg-white border border-border rounded-xl p-10 text-center">
      {Icon ? <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-2" /> : null}
      <p className="font-heading font-semibold text-revive-dark">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground mt-1">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Buscar…" }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-revive-green/30"
      />
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="p-2 rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", onConfirm, onCancel, loading, destructive }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${destructive ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${destructive ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-revive-dark">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <button onClick={onCancel}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border text-revive-dark font-heading font-semibold text-sm hover:bg-muted/40">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 rounded-lg text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-revive-dark hover:bg-revive-dark-mid"}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "revive-green" }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase">{label}</p>
        {Icon ? <Icon className={`w-4 h-4 text-${accent}`} /> : null}
      </div>
      <p className="font-heading font-extrabold text-2xl text-revive-dark mt-1">{value}</p>
    </div>
  );
}

export function useAdminList({ items, pageSize = 10, filterFn }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const f = filterFn ? items.filter((it) => filterFn(it, search)) : items;
    return f;
  }, [items, search, filterFn]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { search, setSearch, page: safePage, setPage, totalPages, paged, total: filtered.length };
}