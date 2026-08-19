import React from "react";

const steps = [
  { n: 1, title: "Eliges tu Kit ideal", desc: "Según tus kilos por bajar, nivel de estrés, sueño, inflamación, energía y señales metabólicas." },
  { n: 2, title: "Empiezas con una semana", desc: "No necesitas comprometerte por meses desde el primer día." },
  { n: 3, title: "Sigues tu video diario de 7 minutos", desc: "Cada día recibes una guía sencilla para mantener enfoque y hábitos." },
  { n: 4, title: "Tu Aliada te acompaña", desc: "No empiezas sola. Tienes seguimiento por WhatsApp." },
  { n: 5, title: "Continúas semana por semana", desc: "La transformación completa está diseñada para 13 semanas, pero empieza con tu primera semana." },
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-revive-dark text-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-center mb-12">Así funciona Revive 7</h2>
        <div className="space-y-6">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="flex gap-5 items-start">
              <div className="w-10 h-10 rounded-full bg-revive-green text-revive-dark font-heading font-black flex items-center justify-center flex-shrink-0">
                {n}
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg mb-1">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}