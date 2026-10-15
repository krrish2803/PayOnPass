import React from "react";
import { HERO_COPY } from "../content/copy";
import { LINKS } from "../config";
import { StatusBadge } from "./StatusBadge";
import { ChevronDown, ExternalLink } from "lucide-react";
import { scrollToTarget } from "../lib/lenis";

export const Hero: React.FC = () => {
  return (
    <section
      id="top"
      aria-label="Hero"
      className="relative min-h-screen flex flex-col justify-between pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="flex-1 flex flex-col justify-center max-w-4xl">
        {/* Verification & Trust Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {HERO_COPY.chips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-white/[0.04] text-muted border border-panel-border backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {chip}
            </span>
          ))}
        </div>

        {/* Large Display Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[1.05] font-display font-bold tracking-tight text-primary mb-6 text-balance">
          {HERO_COPY.h1}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-muted font-body leading-relaxed mb-10 max-w-3xl text-balance">
          {HERO_COPY.sub}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Primary CTA */}
          {LINKS.DEMO_VIDEO_URL ? (
            <a
              href={LINKS.DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base bg-teal-500 text-ink font-semibold hover:bg-teal-400 active:scale-95 shadow-glow-teal"
            >
              Watch the 3-minute demo
            </a>
          ) : (
            <div className="btn-base bg-white/[0.06] text-muted border border-panel-border flex items-center gap-2 cursor-not-allowed">
              <span>Watch the 3-minute demo</span>
              <StatusBadge status="coming-soon" />
            </div>
          )}

          {/* Live Demo CTA */}
          {LINKS.LIVE_DEMO_URL ? (
            <a
              href={LINKS.LIVE_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base panel-glass text-primary hover:bg-white/[0.08] hover:border-teal-500/30"
            >
              Try the live demo
            </a>
          ) : (
            <div className="btn-base panel-glass text-muted flex items-center gap-2 cursor-not-allowed">
              <span>Try the live demo</span>
              <StatusBadge status="coming-soon" />
            </div>
          )}

          {/* GitHub CTA */}
          {LINKS.GITHUB_URL ? (
            <a
              href={LINKS.GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-base panel-glass text-primary hover:bg-white/[0.08] hover:border-teal-500/30 flex items-center gap-2"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-4 h-4 text-muted" />
            </a>
          ) : (
            <div className="btn-base panel-glass text-muted flex items-center gap-2 cursor-not-allowed">
              <span>View on GitHub</span>
              <StatusBadge status="coming-soon" />
            </div>
          )}
        </div>
      </div>

      {/* Scroll cue */}
      <div className="pt-12 flex items-center justify-between text-xs font-mono text-muted border-t border-panel-border/60">
        <button
          onClick={() => scrollToTarget("#problem")}
          className="flex items-center gap-2 hover:text-teal-400 transition-colors py-2 focus:outline-none"
        >
          <ChevronDown className="w-4 h-4 animate-bounce text-teal-400" />
          <span>{HERO_COPY.scrollCue}</span>
        </button>
        <span className="hidden sm:inline">CHAPTER 01 / 08</span>
      </div>
    </section>
  );
};
