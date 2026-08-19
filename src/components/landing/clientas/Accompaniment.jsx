import React from "react";
import { Heart, Check } from "lucide-react";

const items = ["Un Kit semanal", "DailyPacks organizados", "Videos diarios de 7 minutos", "Seguimiento por WhatsApp", "Una Aliada que te acompaña", "Una ruta progresiva de 13 semanas"];

export default function Accompaniment() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-7 h-7 text-revive-green" />
        </div>
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-6">La diferencia está en el acompañamiento</h2>
        <p className="text-muted-foreground text-base leading-relaxed mb-3">
          La mayoría de las personas no abandona porque no quiera cambiar.
        </p>
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          Abandona porque empieza sola, sin método y sin seguimiento.
        </p>
        <p className="font-heading font-semibold text-revive-dark mb-6">Con Revive 7 tienes:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-8">
          {items.map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-revive-cream rounded-xl p-3.5 text-left">
              <Check className="w-4 h-4 text-revive-green flex-shrink-0" />
              <span className="text-sm text-revive-dark font-body">{t}</span>
            </div>
          ))}
        </div>
        <p className="font-heading font-bold text-lg text-revive-dark">Aquí no buscamos perfección.</p>
        <p className="font-heading font-bold text-lg text-revive-green">Buscamos continuidad.</p>
      </div>
    </section>
  );
}