import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import Nav from "@/components/landing/clientas/Nav";
import Hero from "@/components/landing/clientas/Hero";
import Problem from "@/components/landing/clientas/Problem";
import WhatIs from "@/components/landing/clientas/WhatIs";
import HowItWorks from "@/components/landing/clientas/HowItWorks";
import KitsSection from "@/components/landing/clientas/KitsSection";
import Diagnostic from "@/components/landing/clientas/Diagnostic";
import Accompaniment from "@/components/landing/clientas/Accompaniment";
import Method13Weeks from "@/components/landing/clientas/Method13Weeks";
import Comparison from "@/components/landing/clientas/Comparison";
import Objections from "@/components/landing/clientas/Objections";
import LeadInterestForm from "@/components/landing/clientas/LeadInterestForm";
import FinalCTA from "@/components/landing/clientas/FinalCTA";
import LegalFooter from "@/components/landing/clientas/LegalFooter";
import FloatingWhatsApp from "@/components/landing/clientas/FloatingWhatsApp";

export default function LandingClientas() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
      else setReady(true);
    }).catch(() => setReady(true));
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white font-body">
      <Nav />
      <Hero />
      <Problem />
      <WhatIs />
      <HowItWorks />
      <KitsSection />
      <Diagnostic />
      <Accompaniment />
      <Method13Weeks />
      <Comparison />
      <Objections />
      <LeadInterestForm />
      <FinalCTA />
      <LegalFooter />
      <FloatingWhatsApp />
    </div>
  );
}