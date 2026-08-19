import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  { q: "¿Tengo que comprar todo el programa?", a: "No. Puedes empezar con una semana. El método completo está pensado para 13 semanas, pero el primer paso es vivir tu primera semana Revive 7." },
  { q: "¿Cuántos kilos voy a bajar?", a: "Cada persona responde diferente. No prometemos kilos exactos. Revive 7 está diseñado para apoyar hábitos, metabolismo, inflamación, energía y descanso dentro de un proceso acompañado." },
  { q: "¿Es una dieta?", a: "No es una dieta extrema. Es un método semanal que combina DailyPacks, educación diaria y seguimiento." },
  { q: "¿Puedo tomarlo si tengo una condición médica?", a: "Si tienes diagnóstico médico, tomas medicamentos, estás embarazada, lactando o tienes una condición especial, consulta a tu médico antes de iniciar. Revive 7 no sustituye atención médica ni tratamientos." },
  { q: "¿Cuál es el más recomendado?", a: "Para muchas personas, Activa 7 es el mejor equilibrio entre precio, potencia y continuidad. Pero tu Aliada puede orientarte según tu objetivo." },
];

export default function Objections() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-7 h-7 text-revive-green" />
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark">Preguntas frecuentes</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-border rounded-xl px-5 bg-white">
              <AccordionTrigger className="font-heading font-bold text-sm text-revive-dark text-left hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}