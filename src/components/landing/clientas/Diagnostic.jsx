import React, { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, MessageCircle, Check } from "lucide-react";
import { waLink } from "./constants";

const questions = [
  { q: "¿Cuántos kilos te gustaría bajar?", options: [{ label: "3 a 7 kg", v: 1 }, { label: "8 a 14 kg", v: 2 }, { label: "Más de 14 kg", v: 3 }] },
  { q: "¿Dónde acumulas más grasa?", options: [{ label: "Abdomen", v: 2 }, { label: "Cadera/piernas", v: 1 }, { label: "General", v: 2 }] },
  { q: "¿Te inflamas fácilmente?", options: [{ label: "Poco", v: 1 }, { label: "A veces", v: 2 }, { label: "Mucho", v: 3 }] },
  { q: "¿Cómo está tu energía durante el día?", options: [{ label: "Buena", v: 1 }, { label: "Baja", v: 2 }, { label: "Muy baja", v: 3 }] },
  { q: "¿Cómo duermes?", options: [{ label: "Bien", v: 1 }, { label: "Regular", v: 2 }, { label: "Mal", v: 3 }] },
  { q: "¿Cómo está tu nivel de estrés?", options: [{ label: "Bajo", v: 1 }, { label: "Medio", v: 2 }, { label: "Alto", v: 3 }] },
  { q: "¿Te han mencionado alguno de estos puntos?", options: [{ label: "Hígado graso", v: 3 }, { label: "Glucosa elevada", v: 3 }, { label: "Hipertensión", v: 3 }, { label: "Resistencia a la insulina", v: 3 }, { label: "Ninguno", v: 1 }] },
  { q: "¿Estás en menopausia o perimenopausia?", options: [{ label: "Sí", v: 2 }, { label: "No", v: 1 }, { label: "No estoy segura", v: 1 }] },
];

const getResult = (score) => {
  if (score <= 11) return { nombre: "Renueva 7", msg: "Por tus respuestas, Renueva 7 puede ser un buen punto de partida para comenzar sin presión." };
  if (score <= 16) return { nombre: "Activa 7", msg: "Por tus respuestas, Activa 7 es el Kit que puede adaptarse mejor a tu objetivo actual." };
  return { nombre: "Evoluciona 7", msg: "Por tus respuestas, Evoluciona 7 es el nivel más completo para tu situación actual." };
};

export default function Diagnostic() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState([]);

  const start = () => { setStep(0); setAnswers([]); };
  const answer = (v) => {
    const next = [...answers, v];
    setAnswers(next);
    if (next.length === questions.length) setStep(questions.length);
    else setStep(step + 1);
  };
  const reset = () => { setStep(-1); setAnswers([]); };

  if (step === -1) {
    return (
      <section id="diagnostico" className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-revive-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-7 h-7 text-revive-green" />
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-revive-dark mb-4">Descubre tu Kit ideal</h2>
          <p className="text-muted-foreground text-base mb-8 leading-relaxed">
            Responde estas preguntas y tu Aliada Ser Vivo te ayudará a elegir el mejor punto de partida.
          </p>
          <button onClick={start} className="inline-flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-green-light transition-colors">
            Comenzar diagnóstico <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-muted-foreground mt-4">Solo 8 preguntas · Menos de 2 minutos</p>
        </div>
      </section>
    );
  }

  if (step === questions.length) {
    const score = answers.reduce((a, b) => a + b, 0);
    const result = getResult(score);
    return (
      <section id="diagnostico" className="py-20 px-6">
        <div className="max-w-xl mx-auto text-center bg-white rounded-3xl border-2 border-revive-green shadow-lg p-8">
          <span className="inline-block bg-revive-green/10 text-revive-dark font-heading font-semibold text-xs uppercase tracking-wide px-4 py-1.5 rounded-full mb-6">
            Tu resultado
          </span>
          <p className="text-muted-foreground text-sm mb-2">Tu Kit recomendado para iniciar es:</p>
          <h2 className="font-heading font-extrabold text-3xl text-revive-dark mb-4">{result.nombre}™</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">{result.msg}</p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Tu Aliada Ser Vivo puede ayudarte a comenzar esta semana, darte seguimiento y resolver tus dudas.
          </p>
          <div className="flex flex-col gap-3">
            <a href={waLink(`Hola, hice el diagnóstico en la página y me sugirió ${result.nombre}. ¿Me ayudas a empezar?`)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-8 py-4 rounded-full text-base hover:bg-revive-green-light transition-colors">
              <MessageCircle className="w-4 h-4" /> Hablar con mi Aliada
            </a>
            <button onClick={reset} className="inline-flex items-center justify-center gap-2 text-muted-foreground font-body text-sm hover:text-revive-dark transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Volver a hacer el diagnóstico
            </button>
          </div>
        </div>
      </section>
    );
  }

  const q = questions[step];
  const progress = ((step) / questions.length) * 100;
  return (
    <section id="diagnostico" className="py-20 px-6 bg-revive-cream">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Pregunta {step + 1} de {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-revive-green rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <h3 className="font-heading font-bold text-lg md:text-xl text-revive-dark mb-6">{q.q}</h3>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => answer(opt.v)}
                className="w-full text-left px-5 py-3.5 rounded-xl border-2 border-border hover:border-revive-green hover:bg-revive-green-pale/30 transition-colors text-sm font-body text-revive-dark">
                {opt.label}
              </button>
            ))}
          </div>
          {step > 0 && (
            <button onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-revive-dark transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Anterior
            </button>
          )}
        </div>
      </div>
    </section>
  );
}