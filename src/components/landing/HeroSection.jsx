import React from "react";
import { motion } from "framer-motion";
import MagneticButton from "@/components/landing/MagneticButton";
import { ArrowDown } from "lucide-react";

const HERO_IMG = "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/31f3ebc43_generated_c5c04989.png";

export default function HeroSection({ onApply }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Silueta de vendedor de élite frente a paisaje urbano nocturno"
          className="w-full h-full object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F]/60 via-[#0F0F0F]/40 to-[#0F0F0F]" />
      </div>

      {/* Kinetic lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] h-[1px] w-1/3 bg-gradient-to-r from-transparent via-[#FFB800]/30 to-transparent"
        />
        <motion.div
          initial={{ x: "200%" }}
          animate={{ x: "-100%" }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-[60%] h-[1px] w-1/4 bg-gradient-to-r from-transparent via-[#FFB800]/20 to-transparent"
        />
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 3 }}
          className="absolute top-[80%] h-[1px] w-1/5 bg-gradient-to-r from-transparent via-[#E5E5E5]/15 to-transparent"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-[#FFB800] font-heading font-semibold tracking-[0.3em] uppercase text-xs md:text-sm mb-6 md:mb-8"
        >
          Reclutamiento de élite comercial
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="font-heading font-extrabold text-[clamp(2.5rem,8vw,6rem)] leading-[0.95] tracking-tight text-white mb-4"
        >
          TU CIERRE
          <br />
          <span className="italic text-[#FFB800]">MÁS GRANDE</span>
          <br />
          EMPIEZA AQUÍ
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-[#E5E5E5]/80 font-body text-base md:text-lg max-w-xl mx-auto mt-6 md:mt-8 leading-relaxed"
        >
          No buscamos vendedores. Buscamos cerradores que conviertan
          cada conversación en un resultado. Si la ambición es tu motor,
          este es tu siguiente movimiento.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 md:mt-14"
        >
          <MagneticButton onClick={onApply}>
            Reclama tu lugar
          </MagneticButton>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ArrowDown className="w-5 h-5 text-[#E5E5E5]/40" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}