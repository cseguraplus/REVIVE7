import React from "react";
import { motion } from "framer-motion";

const PROFILE_IMG = "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/f50708629_generated_8c03dd16.png";
const DETAIL_IMG = "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/2ba6da0fa_generated_d85e49f0.png";

const traits = [
  "Cierras tratos, no solo abres conversaciones.",
  "La objeción es tu combustible, no tu freno.",
  "Compites contra ti mismo, no contra el mercado.",
  "Tu palabra es tu contrato. Tu resultado, tu tarjeta de presentación."
];

export default function MindsetSection() {
  return (
    <section className="relative py-24 md:py-36 px-6 overflow-hidden">
      {/* Subtle skewed background */}
      <div className="absolute inset-0 -skew-y-2 bg-gradient-to-br from-white/[0.02] to-transparent" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-[#FFB800] font-heading font-semibold tracking-[0.3em] uppercase text-xs mb-4">
              Mentalidad de cerrador
            </p>
            <h2 className="font-heading font-extrabold text-[clamp(2rem,4vw,3rem)] text-white leading-tight mb-8">
              Esto no es para todos.
              <br />
              <span className="italic text-[#FFB800]">Es para ti.</span>
            </h2>

            <div className="space-y-5">
              {traits.map((trait, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="flex items-start gap-4"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FFB800] mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
                  <p className="text-[#E5E5E5]/80 text-base md:text-lg leading-relaxed">
                    {trait}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
              <img
                src={PROFILE_IMG}
                alt="Retrato de perfil con iluminación cinematográfica chiaroscuro"
                className="w-full h-full object-cover grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
            </div>

            {/* Floating detail image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -bottom-6 -left-6 md:-left-10 w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2 border-[#FFB800]/20 shadow-2xl"
            >
              <img
                src={DETAIL_IMG}
                alt="Macro detalle de mecanismo de reloj de precisión"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}