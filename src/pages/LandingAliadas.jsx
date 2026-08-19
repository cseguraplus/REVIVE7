import React from "react";
import Revive7Logo from "@/components/Revive7Logo";
import AliadaApplicationForm from "@/components/landing/AliadaApplicationForm";
import { ArrowRight, MessageCircle, AlertCircle, Sparkles, TrendingUp, Users } from "lucide-react";

const kits = [
  { nombre: "Renueva 7", desc: "Para comenzar.", img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/268f9074d_KitRevive7FondoBco.png" },
  { nombre: "Activa 7", desc: "Para avanzar con más fuerza.", img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/7ce227d3b_KitActiva7FondoBco.png" },
  { nombre: "Evoluciona 7", desc: "Para una transformación más completa.", img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/b513b5622_KitEvoluciona7FondoBco.png" },
];

const escenarios = [
  { clientas: "8 clientas", ingreso: "$8,000" },
  { clientas: "15 clientas", ingreso: "$15,000" },
  { clientas: "25 clientas", ingreso: "$29,000" },
];

export default function LandingAliadas() {
  return (
    <div className="min-h-screen bg-white font-body">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <Revive7Logo size="sm" />
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/5215640006540?text=Hola%2C%20quiero%20informaci%C3%B3n%20para%20ser%20Aliada%20Ser%20Vivo"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-revive-dark font-heading font-semibold text-sm hover:text-revive-green transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <a href="https://apprevive7.mx/login" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-muted-foreground font-heading font-semibold text-sm hover:text-revive-dark transition-colors">
            Ya soy Aliada
          </a>
          <a href="#aplica" className="bg-revive-green text-revive-dark font-heading font-bold text-sm px-5 py-2 rounded-full hover:bg-revive-green-light transition-colors">
            Quiero ser Aliada
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-revive-dark text-white py-20 md:py-32 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-revive-green blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-revive-green blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block bg-revive-green/20 text-revive-green-light font-heading font-semibold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Oportunidad de negocio
          </span>
          <h1 className="font-heading font-extrabold text-[clamp(2rem,6vw,4rem)] leading-tight mb-6">
            Conviértete en <span className="text-revive-green">Aliada Ser Vivo</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-5 leading-relaxed">
            Genera ingresos recomendando un programa de bienestar que tus clientas pueden comenzar esta misma semana.
          </p>
          <p className="text-white/60 text-base max-w-2xl mx-auto mb-3 leading-relaxed">
            Revive 7 es un método semanal con Kits accesibles desde <span className="text-revive-green-light font-semibold">$245</span>, videos diarios de 7 minutos y seguimiento por WhatsApp.
          </p>
          <p className="text-white/60 text-base max-w-2xl mx-auto mb-10 leading-relaxed">
            Te capacitamos para recomendar, vender y acompañar de forma responsable.
          </p>
          <a href="#aplica" className="inline-flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-green-light transition-colors">
            Quiero ser Aliada Ser Vivo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Sección de dolor */}
      <section className="py-20 px-6 bg-revive-cream">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-7 h-7 text-revive-green" />
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-5">
            ¿Has querido generar ingresos extra, pero no sabes qué vender?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-5">
            Muchas mujeres quieren emprender, pero se frenan porque no tienen producto, sistema, capacitación o acompañamiento.
          </p>
          <p className="font-heading font-bold text-xl md:text-2xl text-revive-dark mb-4">
            En Ser Vivo no empiezas sola.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Te damos un método claro, productos accesibles, guiones, materiales y una comunidad para avanzar paso a paso.
          </p>
        </div>
      </section>

      {/* Sección de oportunidad */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-revive-green" />
            </div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-5">
              Revive 7 es fácil de explicar
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-3">
              Tus clientas no tienen que comprar un programa enorme desde el primer día.
            </p>
            <p className="font-heading font-bold text-xl md:text-2xl text-revive-dark">
              Empiezan con una semana.
            </p>
          </div>
          <p className="text-center text-muted-foreground text-base mb-8">Eligen entre 3 Kits:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kits.map((kit, i) => (
              <div key={i} className="rounded-2xl border-2 border-revive-green/20 bg-white overflow-hidden hover:shadow-lg transition-shadow">
                <img src={kit.img} alt={`Kit ${kit.nombre}`} className="w-full h-56 object-contain" />
                <div className="p-5 text-center border-t border-border">
                  <h3 className="font-heading font-bold text-lg text-revive-dark mb-1.5">{kit.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{kit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de dinero */}
      <section className="py-20 px-6 bg-revive-dark text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-revive-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-7 h-7 text-revive-green" />
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-10">
            Tú eliges tus ganancias al mes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {escenarios.map((esc, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7">
                <div className="flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-revive-green/70 mr-1.5" />
                  <span className="text-white/70 text-sm font-body">{esc.clientas}</span>
                </div>
                <p className="font-heading font-extrabold text-3xl text-revive-green">{esc.ingreso}</p>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs max-w-xl mx-auto leading-relaxed">
            Los ingresos dependen de tu actividad, recompra, constancia, zona, mezcla de Kits y seguimiento. No son ingresos garantizados.
          </p>
        </div>
      </section>

      {/* Sección de cierre + Form */}
      <section id="aplica" className="py-20 px-6 bg-revive-cream">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-revive-green/20 text-revive-dark font-heading font-semibold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
              Cupos limitados
            </span>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-4">
              Esta semana estamos formando nuevas Aliadas en CDMX
            </h2>
            <p className="text-muted-foreground text-base">
              Regístrate y recibe información para comenzar con Ser Vivo.
            </p>
          </div>
          <AliadaApplicationForm />
        </div>
      </section>

      <footer className="bg-revive-dark border-t border-white/10 py-8 px-6 text-center">
        <Revive7Logo dark size="sm" />
        <p className="text-white/30 text-xs mt-4">© {new Date().getFullYear()} Ser Vivo. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}