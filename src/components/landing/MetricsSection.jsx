import React from "react";
import { motion } from "framer-motion";
import ImpactTile from "@/components/landing/ImpactTile";

const metrics = [
  {
    number: 150,
    prefix: "$",
    suffix: "K+",
    label: "Ingreso potencial anual",
    description: "Los mejores cerradores de nuestro equipo superan esta cifra cada año. Sin techo."
  },
  {
    number: 45,
    suffix: "%",
    label: "Comisión por cierre",
    description: "Estructura de comisiones agresiva diseñada para premiar al que ejecuta, no al que espera."
  },
  {
    number: 72,
    suffix: "h",
    label: "Onboarding express",
    description: "De la aplicación a tu primer cierre en menos de 72 horas. Sin burocracia, sin esperas."
  },
  {
    number: 94,
    suffix: "%",
    label: "Retención de talento",
    description: "Quienes entran, no se van. Porque aquí se gana lo que en otro lado solo se promete."
  }
];

export default function MetricsSection() {
  return (
    <section className="relative py-24 md:py-36 px-6">
      {/* Section divider line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[#FFB800]/30 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-[#FFB800] font-heading font-semibold tracking-[0.3em] uppercase text-xs mb-4">
            La oportunidad en números
          </p>
          <h2 className="font-heading font-extrabold text-[clamp(2rem,5vw,3.5rem)] text-white leading-tight">
            Los números no mienten.
            <br />
            <span className="italic text-[#E5E5E5]/50">La ambición, tampoco.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {metrics.map((m, i) => (
            <ImpactTile key={i} {...m} delay={i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}