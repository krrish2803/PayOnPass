export type FeatureStatus = "built" | "in-progress" | "planned";

export interface FeatureItem {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
}

export interface FeatureGroup {
  groupTitle: string;
  items: FeatureItem[];
}

/**
 * DEFAULT EVERY STATUS TO "in-progress" so the page never over-claims.
 * The owner flips them as features are verified and deployed.
 */
export const FEATURES_DATA: FeatureGroup[] = [
  {
    groupTitle: "Core loop",
    items: [
      {
        id: "scoping-engine",
        name: "Scoping engine",
        description: "Plain English in, weighted checklist and price out.",
        status: "in-progress",
      },
      {
        id: "hard-rule-gates",
        name: "Hard rule gates",
        description: "Word counts, regex, required terms, JSON schema. The AI cannot override them.",
        status: "in-progress",
      },
      {
        id: "bounded-ai-audit",
        name: "Bounded AI audit",
        description: "Scores soft criteria only, at temperature 0. It can lower a score, never raise it.",
        status: "in-progress",
      },
      {
        id: "weighted-payouts",
        name: "Weighted payouts",
        description: "The split follows the criteria that passed, so every dollar is explainable.",
        status: "in-progress",
      },
      {
        id: "never-pays-twice",
        name: "Never pays twice",
        description: "Every payout and refund carries an idempotency key.",
        status: "in-progress",
      },
      {
        id: "tamper-evident-receipts",
        name: "Tamper-evident receipts",
        description: "Each decision is hashed with the previous one and saved before money moves.",
        status: "in-progress",
      },
      {
        id: "human-review-queue",
        name: "Human review queue",
        description: "Borderline and suspicious jobs wait for approve, reject, or adjust.",
        status: "in-progress",
      },
      {
        id: "fee-aware-ledger",
        name: "Fee-aware ledger",
        description: "Captured = worker payout + refund + platform fee, always.",
        status: "in-progress",
      },
    ],
  },
  {
    groupTitle: "Differentiators",
    items: [
      {
        id: "prompt-injection-defense",
        name: "Prompt-injection defense",
        description: "Hostile text in a submission cannot raise a score and routes the job to review.",
        status: "in-progress",
      },
      {
        id: "agent-api-postman",
        name: "Agent API and Postman collection",
        description: "Agents create jobs, submit work, and receive payouts programmatically.",
        status: "in-progress",
      },
      {
        id: "live-audit-ledger",
        name: "Live audit ledger",
        description: "An AG Grid table of jobs, PayPal IDs, receipt hashes and verification traces.",
        status: "in-progress",
      },
      {
        id: "paypal-webhooks",
        name: "PayPal webhooks",
        description: "Verified events update jobs instantly (hosted demo).",
        status: "in-progress",
      },
      {
        id: "chain-verify-button",
        name: "Chain-verify button",
        description: "Recompute the receipt chain and watch a tampered receipt fail.",
        status: "in-progress",
      },
      {
        id: "verifier-scorecard",
        name: "Verifier scorecard",
        description: "Results of the adversarial test suite.",
        status: "in-progress",
      },
      {
        id: "spending-guardrails",
        name: "Spending guardrails",
        description: "A per-job cap and a daily cap enforced in code.",
        status: "in-progress",
      },
    ],
  },
];
