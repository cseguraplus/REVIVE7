import React from "react";
import { Link } from "react-router-dom";
import Revive7Logo from "@/components/Revive7Logo";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
      <Revive7Logo size="sm" />
      <div className="flex items-center gap-3">
        <a href="#diagnostico" className="hidden sm:block text-revive-dark font-heading font-semibold text-sm hover:text-revive-green transition-colors">
          Descubrir mi Kit ideal
        </a>
        <Link to="/login" className="bg-revive-dark text-white font-heading font-bold text-sm px-5 py-2 rounded-full hover:bg-revive-dark-mid transition-colors">
          Iniciar sesión
        </Link>
      </div>
    </nav>
  );
}