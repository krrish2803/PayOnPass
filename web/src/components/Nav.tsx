import React, { useState, useEffect } from "react";
import { PRODUCT_NAME, LINKS } from "../config";
import { scrollToTarget } from "../lib/lenis";
import { StatusBadge } from "./StatusBadge";

const NAV_ITEMS = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Who it's for", href: "#who" },
  { label: "FAQ", href: "#faq" },
];

export const Nav: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("top");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);

      const sectionIds = ["top", "problem", "solution", "solves", "how", "features", "who", "faq"];
      const scrollPos = window.scrollY + 200;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    scrollToTarget(href);
  };

  return (
    <>
      {/* Accessible Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-teal-500 text-ink font-semibold px-4 py-2 rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to content
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-ink/80 backdrop-blur-md border-b border-panel-border py-3 shadow-lg"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => handleNavClick(e, "#top")}
            className="flex items-center gap-2 group text-primary font-display font-bold text-xl tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-md py-1"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-glow-teal group-hover:scale-125 transition-transform" />
            <span>{PRODUCT_NAME}</span>
          </a>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-teal-400 bg-teal-500/10"
                      : "text-muted hover:text-primary hover:bg-white/[0.04]"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            {LINKS.DEMO_VIDEO_URL ? (
              <a
                href={LINKS.DEMO_VIDEO_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-base bg-teal-500 text-ink font-semibold hover:bg-teal-400 active:scale-95 shadow-glow-teal"
              >
                Watch the demo
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="btn-base bg-white/[0.07] text-muted cursor-not-allowed border border-panel-border flex items-center gap-2"
                title="Demo video is currently being edited"
              >
                <span>Watch the demo</span>
                <StatusBadge status="coming-soon" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
