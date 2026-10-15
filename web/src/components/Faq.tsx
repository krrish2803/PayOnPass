import React, { useState } from "react";
import { FAQ_DATA } from "../content/faq";
import { ChevronDown } from "lucide-react";

export const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative min-h-screen py-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14 text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          FREQUENTLY ASKED QUESTIONS
        </span>
        <h2
          id="faq-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 tracking-tight"
        >
          Common Questions & Caveats
        </h2>
      </div>

      <div className="space-y-3">
        {FAQ_DATA.map((item, idx) => {
          const isOpen = openIndex === idx;
          const contentId = `faq-content-${idx}`;
          const headerId = `faq-header-${idx}`;

          return (
            <div
              key={idx}
              className="panel-glass rounded-xl overflow-hidden border border-panel-border/80 transition-colors"
            >
              <h3>
                <button
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-display font-semibold text-base sm:text-lg text-primary hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-teal-400" : ""
                    }`}
                  />
                </button>
              </h3>

              <div
                id={contentId}
                role="region"
                aria-labelledby={headerId}
                hidden={!isOpen}
                className={`px-5 pb-6 sm:px-6 text-sm sm:text-base text-muted font-body leading-relaxed border-t border-panel-border/30 pt-4 ${
                  isOpen ? "block" : "hidden"
                }`}
              >
                <p>{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
