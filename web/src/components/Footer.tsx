import React from "react";
import { PRODUCT_NAME, LINKS } from "../config";
import { FOOTER_COPY } from "../content/copy";
import { scrollToTarget } from "../lib/lenis";

export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-panel-border/80 bg-ink/90 backdrop-blur-md py-14 px-4 sm:px-6 lg:px-8 z-10 pointer-events-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget("#top");
            }}
            className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span>{PRODUCT_NAME}</span>
          </a>
          <p className="text-xs text-muted font-body mt-2 max-w-sm">
            Pay only for work that passes the test. Automated verify-before-release settlement gateway.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center gap-6 text-sm font-body text-muted">
          {LINKS.GITHUB_URL && (
            <a
              href={LINKS.GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
          )}
          {LINKS.POSTMAN_URL && (
            <a
              href={LINKS.POSTMAN_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              Postman Collection
            </a>
          )}
          {LINKS.README_URL && (
            <a
              href={LINKS.README_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              README
            </a>
          )}
          {LINKS.DEMO_VIDEO_URL && (
            <a
              href={LINKS.DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              Demo Video
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-panel-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-muted/60">
        <p>{FOOTER_COPY.hackathonNote}</p>
        <p>{FOOTER_COPY.trademarkDisclaimer}</p>
      </div>
    </footer>
  );
};
