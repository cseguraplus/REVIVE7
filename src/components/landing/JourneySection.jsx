import React from "react";
import { motion } from "framer-motion";
import { Send, Zap, Rocket, Trophy } from "lucide-react";

const steps = [
  {
    icon: Send,
    number: "01",
    title: "Aplicación",
    subtitle: "3 minutos. Sin CV.",
    description: "Completa el formulario con lo esencial. Nada de currículos interminables. Queremos saber quién eres, no lo que escribes en un PDF."
  },
  {
    icon: Zap,
    number: "02",
    title: "Match",
    subtitle: "Respuesta en 24h.",
    description: "Nuestro equipo revisa tu perfil y te contacta directamente. Si hay fit, lo sabrás de inmediato. Respetamos tu tiempo."
  },
  {
    icon: Rocket,
    number: "03",
    title: "Onboarding",
    subtitle: "Inmersión total.",
    description: "Acceso a herramientas, metodología y tu primer pipeline de prospectos. Todo lo que necesitas para empezar a cerrar desde el día uno."
  },
  {
    icon: Trophy,
    number: "04",
    title: "Éxito",
    subtitle: "Tu primer cierre.",
    description: "La primera comisión es solo el principio. A partir de aquí, el techo lo pones tú. Bienvenido al equipo de cerradores."
  }
];

export default function JourneySection() {
  return (
    <section className="relative py-24 md:py-36 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 md:mb-24"
        >
          <p className="text-[#FFB800] font-heading font-semibold tracking-[0.3em] uppercase text-xs mb-4">
            El proceso
          </p>
          <h2 className="font-heading font-extrabold text-[clamp(2rem,5vw,3.5rem)] text-white leading-tight">
            De la aplicación al cierre.
            <br />
            <span className="italic text-[#E5E5E5]/50">Sin escalas.</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Golden line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="w-full h-full origin-top bg-gradient-to-b from-[#FFB800] via-[#FFB800]/60 to-[#FFB800]/10"
            />
          </div>

          <div className="space-y-12 md:space-y-20">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className={`relative flex items-start gap-6 md:gap-0 ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  {/* Dot on line */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FFB800] shadow-[0_0_16px_rgba(255,184,0,0.5)] z-10 mt-1" />

                  {/* Spacer for mobile */}
                  <div className="w-12 flex-shrink-0 md:hidden" />

                  {/* Content */}
                  <div className={`flex-1 md:w-1/2 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"}`}>
                    <span className="font-heading font-extrabold text-[#FFB800]/30 text-5xl md:text-6xl leading-none">
                      {step.number}
                    </span>
                    <h3 className="font-heading font-bold text-white text-xl md:text-2xl mt-2">
                      {step.title}
                    </h3>
                    <p className="text-[#FFB800] font-heading font-semibold text-sm tracking-wide mt-1">
                      {step.subtitle}
                    </p>
                    <p className="text-[#E5E5E5]/60 text-sm leading-relaxed mt-3 max-w-md inline-block">
                      {step.description}
                    </p>
                  </div>

                  {/* Empty half for desktop layout */}
                  <div className="hidden md:block md:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}