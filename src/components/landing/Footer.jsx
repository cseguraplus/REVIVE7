import React from "react";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FFB800] shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
          <span className="font-heading font-bold text-white text-sm tracking-[0.15em] uppercase">
            Cinética del Cierre
          </span>
        </div>

        <div className="flex items-center gap-8 text-[#E5E5E5]/40 text-xs font-body">
          <a href="mailto:recruiting@cineticadelcierre.com" className="hover:text-[#FFB800] transition-colors duration-300">
            Contacto
          </a>
          <span>·</span>
          <span>Política de Privacidad</span>
          <span>·</span>
          <span>Términos</span>
        </div>

        <p className="text-[#E5E5E5]/20 text-xs font-body">
          © {new Date().getFullYear()} Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}