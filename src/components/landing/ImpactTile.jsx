import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

function AnimatedNumber({ value, prefix = "", suffix = "", duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const stepTime = Math.max(Math.floor((duration * 1000) / end), 10);
    const increment = Math.ceil(end / (duration * 1000 / stepTime));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString("es-MX")}{suffix}
    </span>
  );
}

export default function ImpactTile({ number, prefix, suffix, label, description, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay }}
      className="group relative p-6 md:p-10 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-[#FFB800]/20 transition-all duration-500"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FFB800]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="font-heading font-extrabold text-[clamp(2.5rem,5vw,4.5rem)] leading-none text-white tracking-tight">
          <AnimatedNumber value={number} prefix={prefix} suffix={suffix} />
        </div>
        <div className="mt-3 font-heading font-bold text-[#FFB800] text-sm uppercase tracking-[0.2em]">
          {label}
        </div>
        <p className="mt-2 text-[#E5E5E5]/60 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}