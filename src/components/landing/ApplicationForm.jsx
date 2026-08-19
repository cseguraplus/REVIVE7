import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import MagneticButton from "@/components/landing/MagneticButton";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ApplicationForm({ formRef }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone) return;
    setSubmitting(true);
    try {
      await base44.entities.SalesApplicant.create(form);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section ref={formRef} className="relative py-24 md:py-36 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[#FFB800]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#FFB800]" />
          </div>
          <h3 className="font-heading font-extrabold text-3xl md:text-4xl text-white mb-4">
            Movimiento registrado.
          </h3>
          <p className="text-[#E5E5E5]/70 text-base leading-relaxed">
            Tu aplicación ha sido recibida. Nuestro equipo la revisará y te contactará
            en las próximas 24 horas. Prepárate para tu siguiente cierre.
          </p>
        </motion.div>
      </section>
    );
  }

  return (
    <section ref={formRef} className="relative py-24 md:py-36 px-6">
      {/* Section divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[#FFB800]/30 to-transparent" />

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-[#FFB800] font-heading font-semibold tracking-[0.3em] uppercase text-xs mb-4">
            El cierre es tuyo
          </p>
          <h2 className="font-heading font-extrabold text-[clamp(2rem,5vw,3.5rem)] text-white leading-tight">
            ¿Listo para cerrar?
          </h2>
          <p className="text-[#E5E5E5]/60 text-sm mt-4 max-w-md mx-auto">
            Solo necesitamos lo esencial. Sin CV, sin cartas de presentación.
            Tu ambición habla más fuerte que cualquier documento.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 md:p-12 space-y-6"
        >
          {/* Glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#FFB800]/10 via-transparent to-[#FFB800]/5 -z-10" />

          <div>
            <label className="block font-heading font-semibold text-[#E5E5E5] text-sm tracking-wide mb-2 uppercase">
              Nombre completo
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={handleChange("full_name")}
              placeholder="Tu nombre"
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-5 py-4 text-white placeholder-white/20 font-body text-base focus:outline-none focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/20 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block font-heading font-semibold text-[#E5E5E5] text-sm tracking-wide mb-2 uppercase">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="tu@email.com"
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-5 py-4 text-white placeholder-white/20 font-body text-base focus:outline-none focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/20 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block font-heading font-semibold text-[#E5E5E5] text-sm tracking-wide mb-2 uppercase">
              Teléfono
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="+52 55 1234 5678"
              required
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-5 py-4 text-white placeholder-white/20 font-body text-base focus:outline-none focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/20 transition-all duration-300"
            />
          </div>

          <div className="pt-4 flex justify-center">
            <MagneticButton type="submit">
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Reclama tu lugar"
              )}
            </MagneticButton>
          </div>
        </motion.form>
      </div>
    </section>
  );
}