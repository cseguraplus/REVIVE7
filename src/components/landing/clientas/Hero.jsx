import React from "react";
import { ArrowRight, MessageCircle, Check } from "lucide-react";
import { waLink } from "./constants";

const trustItems = [
  "Kits semanales desde $245",
  "Acompañamiento por WhatsApp",
  "Videos diarios de 7 minutos",
  "3 niveles según tu objetivo",
  "Método progresivo de 13 semanas",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-revive-cream via-white to-revive-green-pale py-20 md:py-28 px-6">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-revive-green/10 blur-3xl" />
      <div className="relative max-w-3xl mx-auto text-center">
        <span className="inline-block bg-revive-dark text-revive-green font-heading font-semibold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          Método semanal de bienestar
        </span>
        <h1 className="font-heading font-extrabold text-[clamp(1.75rem,5vw,3.5rem)] leading-tight text-revive-dark mb-6">
          Empieza tu transformación esta semana con <span className="text-revive-green">Revive 7™</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-4 leading-relaxed">
          Un método semanal con DailyPacks, vídeos diarios de 7 minutos y acompañamiento de una Aliada Ser Vivo.
        </p>
        <p className="text-muted-foreground text-base mb-4 leading-relaxed">
          Diseñado para personas que quieren comenzar a mejorar su peso, inflamación, energía, estrés, hábitos y descanso de forma sencilla y progresiva.
        </p>
        <p className="font-heading font-bold text-lg md:text-xl text-revive-dark mb-8">
          No tienes que cambiar toda tu vida hoy. Solo necesitas empezar con una semana.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <a href="#diagnostico" className="inline-flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-green-light transition-colors">
            Descubrir mi Kit ideal <ArrowRight className="w-4 h-4" />
          </a>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 border-2 border-revive-dark text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-dark hover:text-white transition-colors">
            <MessageCircle className="w-4 h-4" /> Hablar con mi Aliada
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {trustItems.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body">
              <Check className="w-3.5 h-3.5 text-revive-green" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}