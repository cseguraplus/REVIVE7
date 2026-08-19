import React from "react";
import { Sparkles, X, Check } from "lucide-react";

const isNot = ["No es una dieta extrema", "No es un reto pasajero", "No es tomar cápsulas sin dirección"];
const isYes = ["Un sistema con ciencia pero simple", "Para empezar a cuidar tu metabolismo", "Hábitos, descanso y bienestar general"];

export default function WhatIs() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-7 h-7 text-revive-green" />
        </div>
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-6">¿Qué es Revive 7?</h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
          Revive 7™ es un método semanal de bienestar creado por Ser Vivo.
        </p>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
          Cada semana recibes un Kit con DailyPacks organizados, acceso a videos diarios de 7 minutos y acompañamiento de una Aliada Ser Vivo para ayudarte a mejorar de forma constante.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 text-left">
            {isNot.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-revive-green/30 bg-revive-green-pale/50 p-5 text-left">
            {isYes.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
                <Check className="w-4 h-4 text-revive-green flex-shrink-0" />
                <span className="text-sm text-revive-dark font-body">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}