import React, { useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";

export default function ProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left"
      style={{
        scaleX: scrollYProgress,
        background: "linear-gradient(90deg, #FFB800 0%, #FFF0C0 50%, #FFB800 100%)",
        boxShadow: "0 0 12px rgba(255, 184, 0, 0.6)",
      }}
    />
  );
}