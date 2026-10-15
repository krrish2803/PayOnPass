import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "./lib/lenis";
import { scrollStore } from "./lib/scroll";

// Components
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Problem } from "./components/Problem";
import { Solution } from "./components/Solution";
import { Solves } from "./components/Solves";
import { HowItWorks } from "./components/HowItWorks";
import { Features } from "./components/Features";
import { Audience } from "./components/Audience";
import { FinalCta } from "./components/FinalCta";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { CanvasContainer } from "./three/CanvasContainer";

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = initSmoothScroll();

    // 2. Setup GSAP ScrollTrigger for Global Progress
    const stGlobal = ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Direct mutation of store WITHOUT triggering React re-renders
        scrollStore.globalProgress = self.progress;
      },
    });

    // 3. Section ScrollTrigger Animations (Fade & rise 16px, once)
    const ctx = gsap.context(() => {
      const sections = ["#problem", "#solution", "#solves", "#how", "#features", "#who", "#cta", "#faq"];

      sections.forEach((selector) => {
        gsap.from(`${selector} .panel-glass`, {
          scrollTrigger: {
            trigger: selector,
            start: "top 80%",
            toggleActions: "play none none none",
            once: true,
          },
          y: 16,
          opacity: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power2.out",
        });
      });
    }, containerRef);

    return () => {
      stGlobal.kill();
      ctx.revert();
      lenis?.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-ink text-primary">
      {/* 3D WebGL Canvas Layer (Fixed, behind everything, non-interactive) */}
      <CanvasContainer />

      {/* Sticky Navigation Header */}
      <Nav />

      {/* Main Accessible DOM Content Layer */}
      <main id="main-content" className="relative z-10">
        <Hero />
        <Problem />
        <Solution />
        <Solves />
        <HowItWorks />
        <Features />
        <Audience />
        <FinalCta />
        <Faq />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
