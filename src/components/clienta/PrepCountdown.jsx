import React, { useEffect, useState } from "react";

export default function PrepCountdown({ startDate }) {
  const calc = () => {
    const diff = new Date(startDate).getTime() - Date.now();
    if (diff <= 0) return { done: true, days: 0, hours: 0, mins: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      done: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  if (t.done) {
    return <p className="text-revive-green-light font-heading font-bold text-lg">¡Tu programa comienza hoy!</p>;
  }

  return (
    <div className="flex gap-3 justify-center">
      {[["Días", t.days], ["Horas", t.hours], ["Min", t.mins]].map(([label, value]) => (
        <div key={label} className="bg-white/10 rounded-xl px-4 py-3 text-center min-w-[72px]">
          <p className="text-2xl font-heading font-bold text-revive-green-light">{String(value).padStart(2, "0")}</p>
          <p className="text-xs text-white/60">{label}</p>
        </div>
      ))}
    </div>
  );
}