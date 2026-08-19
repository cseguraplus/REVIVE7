import React from "react";
import { Check, MessageCircle } from "lucide-react";
import { kits, waLink } from "./constants";

export default function KitsSection() {
  return (
    <section className="py-20 px-6 bg-revive-cream">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-4">Elige tu punto de partida</h2>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
            Revive 7 tiene tres niveles para que puedas comenzar de acuerdo con tu objetivo, presupuesto y condición actual.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kits.map((kit) => (
            <div key={kit.nombre} className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col ${kit.badge ? "border-revive-green shadow-lg" : "border-border shadow-sm"}`}>
              <div className="relative bg-white p-4 flex items-center justify-center">
                <img src={kit.img} alt={`Kit ${kit.nombre}`} className="w-full h-44 object-contain" />
                {kit.badge && (
                  <span className="absolute top-3 left-3 bg-revive-green text-revive-dark font-heading font-bold text-xs px-3 py-1 rounded-full">
                    ⭐ {kit.badge}
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1 border-t border-border">
                <span className="text-xs text-revive-green font-heading font-semibold uppercase tracking-wide mb-1">{kit.tag}</span>
                <h3 className="font-heading font-bold text-xl text-revive-dark mb-3">{kit.nombre}™</h3>
                <div className="mb-3">
                  <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recomendado para:</p>
                  <ul className="space-y-1">
                    {kit.recomendado.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-revive-green mt-0.5 flex-shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-3">
                  <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Incluye por día:</p>
                  <ul className="space-y-1">
                    {kit.incluye.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-revive-green mt-0.5 flex-shrink-0" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground italic leading-relaxed mb-3">{kit.mensaje}</p>
                <div className="mt-auto">
                  <p className="font-heading font-extrabold text-2xl text-revive-dark mb-3">
                    ${kit.precio}<span className="text-sm font-body font-normal text-muted-foreground"> /semana</span>
                  </p>
                  <a
                    href={waLink(`Hola, quiero empezar con ${kit.nombre}. ¿Me ayudas?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full inline-flex items-center justify-center gap-2 font-heading font-bold py-3 rounded-xl text-sm transition-colors ${kit.badge ? "bg-revive-green text-revive-dark hover:bg-revive-green-light" : "bg-revive-dark text-white hover:bg-revive-dark-mid"}`}
                  >
                    <MessageCircle className="w-4 h-4" /> Quiero empezar con {kit.nombre}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Pregunta a tu Aliada si todavía puedes iniciar en la generación de esta semana.
        </p>
      </div>
    </section>
  );
}