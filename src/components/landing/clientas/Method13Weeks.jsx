import React from "react";
import { Calendar } from "lucide-react";

const phases = [
  { fase: "Semana 1", desc: "Empiezas." },
  { fase: "Semana 2 a 4", desc: "Construyes constancia." },
  { fase: "Semana 5 a 8", desc: "Refuerzas hábitos." },
  { fase: "Semana 9 a 13", desc: "Consolidas el proceso." },
];

export default function Method13Weeks() {
  return (
    <section className="py-20 px-6 bg-revive-dark text-white">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 bg-revive-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-7 h-7 text-revive-green" />
        </div>
        <h2 className="font-heading font-bold text-2xl md:text-3xl mb-4">Una semana puede ser el inicio de todo</h2>
        <p className="text-white/60 text-base leading-relaxed mb-3">
          Revive 7 está diseñado como un proceso de 13 semanas.
        </p>
        <p className="text-white/60 text-base leading-relaxed mb-3">
          Pero no tienes que decidir por 13 semanas hoy.
        </p>
        <p className="text-white font-heading font-semibold text-base mb-10">
          Empiezas con tu primera semana. Al terminarla, junto con tu Aliada revisas cómo te sentiste y preparas tu siguiente Kit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {phases.map((p, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="w-8 h-8 rounded-full bg-revive-green text-revive-dark font-heading font-black flex items-center justify-center text-sm mb-3 mx-auto">
                {i + 1}
              </div>
              <p className="font-heading font-bold text-sm text-revive-green mb-1">{p.fase}</p>
              <p className="text-white/60 text-xs">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}