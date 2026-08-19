import React from "react";
import WhatsAppButton from "@/components/aliada/WhatsAppButton";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };

export default function AliadaAlertCard({ nombre, motivo, fecha, estado, phone, message, intensity, available }) {
  const hasPhone = phone && String(phone).replace(/[^0-9]/g, "").length >= 8;
  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-revive-dark leading-tight truncate">{nombre}</h3>
          {estado && <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-revive-cream text-revive-dark/70 mt-1">{estado}</span>}
        </div>
        {intensity && (
          <span className="text-xs font-heading font-bold text-revive-green bg-revive-green-pale px-2 py-1 rounded-full whitespace-nowrap">
            {INTENSITY_LABEL[intensity] || intensity} · {available} disp.
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1 font-semibold">{motivo}</span>
        {fecha && <span className="text-muted-foreground">{fecha}</span>}
      </div>
      {hasPhone ? (
        <WhatsAppButton phone={phone} message={message} />
      ) : (
        <p className="text-xs text-muted-foreground">Sin teléfono de contacto registrado.</p>
      )}
    </div>
  );
}