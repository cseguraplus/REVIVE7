import React from "react";
import { MessageCircle } from "lucide-react";
import { waLink } from "./constants";

export default function FloatingWhatsApp() {
  return (
    <a
      href={waLink("Hola, quiero información sobre Revive 7.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-revive-green-light transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">Hablar con mi Aliada</span>
    </a>
  );
}