import React from "react";
import Revive7Logo from "@/components/Revive7Logo";

export default function LegalFooter() {
  return (
    <footer className="bg-revive-dark py-10 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <Revive7Logo dark size="sm" />
        </div>
        <p className="text-white/40 text-xs leading-relaxed mb-4">
          Revive 7 es un programa de bienestar y suplementación funcional. No diagnostica, trata, cura ni previene enfermedades. Los resultados pueden variar según cada persona, hábitos, alimentación, actividad física, descanso, constancia y condición individual. En caso de embarazo, lactancia, uso de medicamentos o diagnóstico médico, consulta a un profesional de salud antes de iniciar.
        </p>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} Ser Vivo. Todos los derechos reservados. | revive7.mx</p>
      </div>
    </footer>
  );
}