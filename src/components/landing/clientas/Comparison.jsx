import React from "react";
import { MessageCircle } from "lucide-react";
import { waLink } from "./constants";

const rows = [
  { kit: "Renueva 7", ideal: "Probar, empezar, 3–7 kg", precio: "$245" },
  { kit: "Activa 7", ideal: "Avanzar, 8–14 kg, energía/metabolismo", precio: "$350" },
  { kit: "Evoluciona 7", ideal: "Más de 14 kg, estrés, sueño y señales metabólicas", precio: "$490" },
];

export default function Comparison() {
  return (
    <section className="py-20 px-6 bg-revive-cream">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark text-center mb-8">Comparativo rápido</h2>

        {/* Desktop: table */}
        <div className="hidden sm:block bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-revive-dark text-white">
                <th className="text-left px-5 py-3 font-heading font-bold">Kit</th>
                <th className="text-left px-5 py-3 font-heading font-bold">Ideal para</th>
                <th className="text-left px-5 py-3 font-heading font-bold">Precio semanal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-revive-cream/50"}>
                  <td className="px-5 py-4 font-heading font-bold text-revive-dark whitespace-nowrap">{r.kit}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.ideal}</td>
                  <td className="px-5 py-4 font-heading font-bold text-revive-dark whitespace-nowrap">{r.precio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="sm:hidden space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-revive-dark">{r.kit}</span>
                <span className="font-heading font-bold text-revive-green">{r.precio}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.ideal}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground text-sm mb-4">¿No sabes cuál elegir?</p>
          <p className="text-revive-dark font-heading font-semibold text-sm mb-4">
            Tu Aliada Ser Vivo puede ayudarte a decidir en menos de 5 minutos.
          </p>
          <a href={waLink("Hola, no sé qué Kit elegir. ¿Me ayudas a decidir?")} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-revive-dark text-white font-heading font-bold px-6 py-3 rounded-full text-sm hover:bg-revive-dark-mid transition-colors">
            <MessageCircle className="w-4 h-4" /> Hablar con mi Aliada
          </a>
        </div>
      </div>
    </section>
  );
}