import React from "react";
import { FeatureStatus } from "../content/features";

interface StatusBadgeProps {
  status: FeatureStatus | "coming-soon";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  if (status === "built") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 ${className}`}>
        built
      </span>
    );
  }

  if (status === "in-progress") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
        in-progress
      </span>
    );
  }

  if (status === "coming-soon") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20 ${className}`}>
        coming soon
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 ${className}`}>
      planned
    </span>
  );
};
