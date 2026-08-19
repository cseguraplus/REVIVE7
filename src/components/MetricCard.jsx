import React from "react";

export default function MetricCard({ icon: Icon, label, value, sub, color = "green" }) {
  const colors = {
    green: "bg-revive-green/10 text-revive-green border-revive-green/20",
    dark: "bg-revive-dark/10 text-revive-dark border-revive-dark/20",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    blue: "bg-teal-50 text-teal-700 border-teal-200",
  };
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center border ${colors[color]} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-body font-medium uppercase tracking-wide">{label}</p>
        <p className="font-heading font-bold text-2xl text-revive-dark mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}