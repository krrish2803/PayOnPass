import React from "react";
import { FINAL_CTA_COPY } from "../content/copy";
import { LINKS } from "../config";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, Terminal, Shield } from "lucide-react";

export const FinalCta: React.FC = () => {
  return (
    <section
      id="cta"
      aria-labelledby="cta-heading"
      className="relative min-h-[80vh] flex flex-col justify-center items-center text-center py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto z-10 pointer-events-auto"
    >
      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-8 shadow-glow-teal">
        <Shield className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold mb-3">
        CHAPTER 08 · CONCLUSION
      </span>

      <h2
        id="cta-heading"
        className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-primary tracking-tight mb-4"
      >
        {FINAL_CTA_COPY.h2}
      </h2>

      <p className="text-lg sm:text-xl text-muted font-body max-w-2xl mb-10 leading-relaxed">
        {FINAL_CTA_COPY.sub}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
        {/* Watch Demo */}
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

        {/* Live Demo */}
        {LINKS.LIVE_DEMO_URL ? (
          <a
            href={LINKS.LIVE_DEMO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-base panel-glass text-primary hover:bg-white/[0.08]"
          >
            Try the live demo
          </a>
        ) : (
          <div className="btn-base panel-glass text-muted flex items-center gap-2 cursor-not-allowed">
            <span>Try the live demo</span>
            <StatusBadge status="coming-soon" />
          </div>
        )}

        {/* Read Code (GitHub) */}
        {LINKS.GITHUB_URL ? (
          <a
            href={LINKS.GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-base panel-glass text-primary hover:bg-white/[0.08] flex items-center gap-2"
          >
            <span>Read the code</span>
            <ExternalLink className="w-4 h-4 text-muted" />
          </a>
        ) : (
          <div className="btn-base panel-glass text-muted flex items-center gap-2 cursor-not-allowed">
            <span>Read the code</span>
            <StatusBadge status="coming-soon" />
          </div>
        )}

        {/* Postman Collection */}
        {LINKS.POSTMAN_URL ? (
          <a
            href={LINKS.POSTMAN_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-base panel-glass text-primary hover:bg-white/[0.08] flex items-center gap-2"
          >
            <Terminal className="w-4 h-4 text-orange-400" />
            <span>Open Postman collection</span>
          </a>
        ) : (
          <div className="btn-base panel-glass text-muted flex items-center gap-2 cursor-not-allowed">
            <Terminal className="w-4 h-4 text-orange-400/60" />
            <span>Open the Postman collection</span>
            <StatusBadge status="coming-soon" />
          </div>
        )}
      </div>

      {/* Small print */}
      <p className="text-xs font-mono text-muted/70 tracking-wide">
        {FINAL_CTA_COPY.disclaimer}
      </p>
    </section>
  );
};
