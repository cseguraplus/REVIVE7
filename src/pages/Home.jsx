import React, { useRef } from "react";
import ProgressBar from "@/components/landing/ProgressBar";
import HeroSection from "@/components/landing/HeroSection";
import MetricsSection from "@/components/landing/MetricsSection";
import JourneySection from "@/components/landing/JourneySection";
import MindsetSection from "@/components/landing/MindsetSection";
import ApplicationForm from "@/components/landing/ApplicationForm";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const formRef = useRef(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white overflow-x-hidden">
      <ProgressBar />
      <HeroSection onApply={scrollToForm} />
      <MetricsSection />
      <JourneySection />
      <MindsetSection />
      <ApplicationForm formRef={formRef} />
      <Footer />
    </div>
  );
}