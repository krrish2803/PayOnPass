import React from "react";
import { DEMO_RECEIPT } from "../content/copy";
import { ShieldCheck, Hash } from "lucide-react";

export const ReceiptCard: React.FC = () => {
  return (
    <div className="panel-glass rounded-xl p-6 sm:p-7 font-mono text-xs sm:text-sm border border-panel-border/80 shadow-2xl">
      {/* Receipt Header */}
      <div className="flex items-center justify-between pb-4 border-b border-panel-border/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="font-semibold text-primary uppercase tracking-wider">
            Sealed Evaluation Receipt (Demo)
          </span>
        </div>
        <span className="text-muted/60 text-[11px]">ID: rcpt_3f9a_001</span>
      </div>

      {/* Meta Specs */}
      <div className="py-4 border-b border-panel-border/40 grid grid-cols-2 gap-y-2 text-muted">
        <div>
          Job: <span className="text-primary font-medium">{DEMO_RECEIPT.jobTitle}</span>
        </div>
        <div>
          Price: <span className="text-primary font-medium">{DEMO_RECEIPT.price}</span>
        </div>
        <div>
          Score: <span className="text-teal-400 font-bold">{DEMO_RECEIPT.score}</span>
        </div>
        <div>
          Decision: <span className="text-amber-400 font-bold">{DEMO_RECEIPT.decision}</span>
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="py-4 border-b border-panel-border/40 space-y-2">
        <div className="text-muted/70 text-[11px] uppercase tracking-wider mb-1">
          Machine-Checked Criteria
        </div>
        {DEMO_RECEIPT.criteria.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-1">
            <span className="text-muted flex items-center gap-2">
              <span className={c.status === "PASS" ? "text-teal-400" : "text-fail"}>
                {c.status === "PASS" ? "✔" : "✖"}
              </span>
              <span>{c.label}</span>
              {c.gate && (
                <span className="text-[10px] px-1 py-0.2 rounded bg-white/[0.06] text-muted/80">
                  gate
                </span>
              )}
            </span>
            <span className="text-primary font-mono">{c.weight}</span>
          </div>
        ))}
      </div>

      {/* Settlement Amounts Breakdown */}
      <div className="py-4 border-b border-panel-border/40 space-y-1.5 text-muted">
        <div className="flex justify-between">
          <span>Worker Payout:</span>
          <span className="text-teal-400 font-semibold">{DEMO_RECEIPT.amounts.workerPayout}</span>
        </div>
        <div className="flex justify-between">
          <span>Client Refund:</span>
          <span className="text-primary font-semibold">{DEMO_RECEIPT.amounts.clientRefund}</span>
        </div>
        <div className="flex justify-between text-muted/70">
          <span>Platform Fee ({DEMO_RECEIPT.amounts.feeLabel}):</span>
          <span className="text-muted">{DEMO_RECEIPT.amounts.platformFee}</span>
        </div>
      </div>

      {/* Cryptographic Chain Seal */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted/60 gap-1">
        <div className="flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-teal-400/60" />
          <span>prev: {DEMO_RECEIPT.prevHash}</span>
        </div>
        <div>
          hash: <span className="text-teal-400/80 font-semibold">{DEMO_RECEIPT.hash}</span>
        </div>
      </div>
    </div>
  );
};
