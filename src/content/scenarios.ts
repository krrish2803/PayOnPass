export type OutcomeType = "worker_stream" | "split_stream" | "client_refund" | "review_bay";

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  workerPayout: number;
  clientRefund: number;
  platformFee: number;
  workerFormatted: string;
  refundFormatted: string;
  feeFormatted: string;
  badge?: {
    label: string;
    type: "review" | "pass" | "fail";
  };
  outcomeType: OutcomeType;
  reviewNote?: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "clean-pass",
    name: "Clean pass",
    description: "All 5 criteria pass cleanly. Worker receives full payment less the platform fee.",
    workerPayout: 18.00,
    clientRefund: 0.00,
    platformFee: 2.00,
    workerFormatted: "$18.00",
    refundFormatted: "$0.00",
    feeFormatted: "$2.00",
    outcomeType: "worker_stream",
  },
  {
    id: "partial-split",
    name: "Partial split (score 60%)",
    description: "Word count and tone criteria failed. Worker is paid for the 60% that passed, client refunded the rest.",
    workerPayout: 10.80,
    clientRefund: 8.00,
    platformFee: 1.20,
    workerFormatted: "$10.80",
    refundFormatted: "$8.00",
    feeFormatted: "$1.20",
    outcomeType: "split_stream",
  },
  {
    id: "hard-fail",
    name: "Hard fail",
    description: "Three or more criteria failed (score < 50%). Client receives 100% full refund.",
    workerPayout: 0.00,
    clientRefund: 20.00,
    platformFee: 0.00,
    workerFormatted: "$0.00",
    refundFormatted: "$20.00",
    feeFormatted: "$0.00",
    outcomeType: "client_refund",
  },
  {
    id: "injection-attempt",
    name: "Injection attempt (held, then rejected)",
    description: "Adversarial payload detected in submission. Job automatically pauses in human review queue, then rejected.",
    workerPayout: 0.00,
    clientRefund: 20.00,
    platformFee: 0.00,
    workerFormatted: "$0.00",
    refundFormatted: "$20.00",
    feeFormatted: "$0.00",
    badge: {
      label: "Held for human review: SUSPECTED_INJECTION",
      type: "review",
    },
    outcomeType: "review_bay",
    reviewNote: "Prompt injection detected. Decision: REJECT & full refund.",
  },
  {
    id: "borderline",
    name: "Borderline (held, reviewer adjusts to 80%)",
    description: "Soft criteria scored near threshold (80%). Paused for reviewer inspection, adjusted, and settled.",
    workerPayout: 14.40,
    clientRefund: 4.00,
    platformFee: 1.60,
    workerFormatted: "$14.40",
    refundFormatted: "$4.00",
    feeFormatted: "$1.60",
    badge: {
      label: "Human review: ADJUSTED_TO_80%",
      type: "review",
    },
    outcomeType: "split_stream",
    reviewNote: "Reviewer assessed borderline tone as acceptable at 80% split.",
  },
];

export const SCENARIO_FOOTNOTE = "Demo amounts use a placeholder 10% platform fee. In every row, worker + refund + fee = $20.00.";
