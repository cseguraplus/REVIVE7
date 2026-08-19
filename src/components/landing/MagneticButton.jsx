import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function MagneticButton({ children, onClick, className = "", type = "button" }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distX = clientX - centerX;
    const distY = clientY - centerY;
    setPosition({ x: distX * 0.3, y: distY * 0.3 });
  };

  const handleLeave = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      type={type}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 250, damping: 15, mass: 0.5 }}
      className={`relative group cursor-pointer ${className}`}
    >
      <span className="absolute inset-0 rounded-full bg-[#FFB800] opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
      <span className="relative z-10 flex items-center justify-center gap-2 px-8 py-4 md:px-12 md:py-5 bg-[#FFB800] text-[#0F0F0F] font-heading font-extrabold text-sm md:text-base uppercase tracking-[0.2em] rounded-full transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(255,184,0,0.4)]">
        {children}
      </span>
    </motion.button>
  );
}