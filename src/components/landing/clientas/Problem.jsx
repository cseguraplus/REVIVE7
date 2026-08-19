import React from "react";
import { AlertCircle } from "lucide-react";

const problems = [
  "Te inflamas fácilmente.",
  "Te sientes cansada durante el día.",
  "Te cuesta bajar grasa abdominal.",
  "Duermes mal o despiertas sin energía.",
  "Tienes ansiedad por comer.",
  "Has subido de peso por estrés o menopausia.",
  "Te han mencionado hígado graso, glucosa alta, hipertensión o resistencia a la insulina.",
  "Ya probaste varias cosas y no logras mantener constancia.",
];

export default function Problem() {
  return (
    <section className="py-20 px-6 bg-revive-cream">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-7 h-7 text-revive-green" />
        </div>
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-4">¿Te pasa algo de esto?</h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-3">
          A veces el problema no es falta de voluntad.
        </p>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
          Muchas personas intentan bajar de peso, comer mejor o sentirse con más energía, pero se detienen porque no tienen un método simple, seguimiento ni una forma clara de empezar.
        </p>
        <p className="text-sm text-muted-foreground italic mb-6">Marca mentalmente lo que más se parece a ti:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
          {problems.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-white rounded-xl border border-border p-3.5">
              <span className="w-2 h-2 rounded-full bg-revive-green mt-1.5 flex-shrink-0" />
              <span className="text-sm text-revive-dark font-body">{p}</span>
            </div>
          ))}
        </div>
        <p className="font-heading font-bold text-lg md:text-xl text-revive-dark mt-8">
          Revive 7 fue diseñado para ayudarte a comenzar, una semana a la vez.
        </p>
      </div>
    </section>
  );
}