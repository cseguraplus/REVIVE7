export const WHATSAPP_NUMBER = "5215640006540";

export const waLink = (msg) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg || "Hola, vi la página de Revive 7 y quiero información para empezar.")}`;

export const kits = [
  {
    nombre: "Renueva 7",
    tag: "Para empezar sin miedo",
    img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/268f9074d_KitRevive7FondoBco.png",
    precio: 245,
    recomendado: ["1 a 7 kg de sobrepeso", "Personas escépticas que quieren probar primero", "Inflamación ligera", "Primer paso hacia mejores hábitos", "Presupuesto inicial accesible"],
    incluye: ["1 cápsula de cada DailyPack correspondiente"],
    mensaje: "Renueva 7 es perfecto si quieres empezar sin presión y vivir tu primera semana Revive 7.",
  },
  {
    nombre: "Activa 7",
    tag: "Para avanzar con más fuerza",
    badge: "El más recomendado",
    img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/7ce227d3b_KitActiva7FondoBco.png",
    precio: 350,
    recomendado: ["8 a 12 kg de sobrepeso", "Metabolismo lento", "Cansancio frecuente", "Inflamación", "Estrés moderado", "Antojos o ansiedad por comer", "Personas que quieren resultados más visibles"],
    incluye: ["2 cápsulas de Reinicia 7", "2 cápsulas de Balance 7", "1 cápsula de Descansa 7"],
    mensaje: "Activa 7 es el Kit ideal para la mayoría de las personas que quieren empezar con mayor fuerza sin irse al nivel más alto.",
  },
  {
    nombre: "Evoluciona 7",
    tag: "Para una transformación más completa",
    img: "https://media.base44.com/images/public/6a4400912c7465eb3d882f4c/b513b5622_KitEvoluciona7FondoBco.png",
    precio: 490,
    recomendado: ["Más de 14 kg de sobrepeso", "Grasa abdominal marcada", "Sin energía", "Estrés alto", "Insomnio o descanso deficiente", "Hígado graso", "Glucosa elevada", "Hipertensión", "Menopausia o perimenopausia", "Resistencia a la insulina"],
    incluye: ["2 cápsulas de Purifica 7", "3 cápsulas de Redefine 7", "2 cápsulas de Renace 7"],
    mensaje: "Evoluciona 7 es el nivel más completo para quienes necesitan un inicio más serio, estructurado y acompañado.",
  },
];