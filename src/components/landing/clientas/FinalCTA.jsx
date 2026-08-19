import React from "react";
import { MessageCircle, ArrowRight } from "lucide-react";
import { waLink } from "./constants";

export default function FinalCTA() {
  return (
    <section className="py-20 px-6 bg-revive-green">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-heading font-extrabold text-3xl md:text-4xl text-revive-dark mb-4">No lo dejes para después</h2>
        <p className="text-revive-dark/70 text-base mb-8 leading-relaxed">
          Si ya sabes que quieres sentirte mejor, empezar esta semana puede ser una gran decisión.
        </p>
        <p className="text-revive-dark font-heading font-semibold text-base mb-1">No necesitas hacerlo perfecto.</p>
        <p className="text-revive-dark font-heading font-semibold text-base mb-1">No necesitas cambiar toda tu vida.</p>
        <p className="text-revive-dark font-heading font-bold text-lg mb-8">Solo necesitas comenzar.</p>
        <p className="text-revive-dark/80 text-sm mb-8">Empieza con tu primera semana Revive 7.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={waLink("Hola, quiero empezar mi primera semana Revive 7.")} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-revive-dark text-white font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-dark-mid transition-colors">
            <MessageCircle className="w-4 h-4" /> Hablar con mi Aliada
          </a>
          <a href="#diagnostico" className="inline-flex items-center justify-center gap-2 border-2 border-revive-dark text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-dark hover:text-white transition-colors">
            Descubrir mi Kit ideal <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}