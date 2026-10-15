import { PRODUCT_NAME } from "../config";

export const HERO_COPY = {
  h1: "Pay only for work that passes the test.",
  sub: `${PRODUCT_NAME} holds the payment, checks the delivered work against criteria agreed up front, and pays out by the result. For freelancers, clients, and the AI agents that hire them.`,
  chips: [
    "Built on the PayPal sandbox",
    "Open source (MIT)",
    "Sandbox prototype, no real money",
  ],
  scrollCue: "Scroll to explore the mechanism",
};

export const PROBLEM_COPY = {
  h2: "Nobody wants to go first on a small job.",
  cards: [
    {
      title: "Client pays first",
      desc: "The client may receive junk, or nothing.",
    },
    {
      title: "Worker delivers first",
      desc: "The worker may never be paid.",
    },
    {
      title: "Marketplace escrow works, but costs a lot",
      desc: "It costs about 10% to 20% of what a freelancer earns, and a human decides disputes days later.",
      footnote: "Marketplace fees vary; check current rates.",
    },
    {
      title: "AI agents that hire other agents",
      desc: "They have no reputation and no support desk, so work is either trusted blindly or never done.",
    },
  ],
  closing: "Small digital jobs have no cheap way to guarantee payment for work that meets the spec.",
};

export const SOLUTION_COPY = {
  h2: "Let the checklist decide, not an argument.",
  sub: `${PRODUCT_NAME} turns the agreement into a machine-checkable checklist before any money moves.`,
  pillars: [
    {
      step: "01",
      title: "Agree the spec first",
      desc: "A scoping agent turns plain English into a weighted checklist and a price; the client approves it.",
    },
    {
      step: "02",
      title: "Hold the money",
      desc: "The client pays up front; the payment is captured and held in a sandbox platform balance.",
    },
    {
      step: "03",
      title: "Verify, then pay",
      desc: "Rules and an AI audit score the work; the result decides the payout automatically.",
    },
  ],
};

export const SOLVES_MAPPING = {
  h2: "Every pain has a built-in answer.",
  rows: [
    {
      pain: "Client risk",
      answer: "Money is released only when the work passes. A failed job is refunded.",
    },
    {
      pain: "Worker risk",
      answer: "The money is already captured and held, and is paid automatically when the criteria are met.",
    },
    {
      pain: "Fees and friction",
      answer: "A fee line is shown on every job, so nothing is hidden. No talent marketplace, no bidding.",
    },
    {
      pain: "Slow, subjective disputes",
      answer: "Rule checks decide first; a receipt explains every decision; a human only sees borderline or suspicious jobs.",
    },
    {
      pain: "Agents with no reputation",
      answer: "A JSON API lets an agent create a job, submit work, and receive a payout with no UI.",
    },
  ],
};

export const HOW_IT_WORKS_STEPS = [
  {
    num: "1",
    name: "Scope",
    desc: "The client describes the job in plain English. An agent returns a weighted checklist and a price. The client approves it.",
  },
  {
    num: "2",
    name: "Fund",
    desc: "The client pays through PayPal Orders. The payment is captured and held.",
  },
  {
    num: "3",
    name: "Deliver",
    desc: "A freelancer, or an AI agent through the API, submits the work.",
  },
  {
    num: "4",
    name: "Verify",
    desc: "Rule checks run first and cannot be overridden. An AI audit scores only the soft criteria, and it can lower a score but never raise it.",
  },
  {
    num: "5",
    name: "Settle",
    desc: "A hash-chained receipt is saved first. Then the worker is paid, the client is refunded, or the money is split. Borderline or suspicious jobs wait for a human.",
  },
];

export const DECISION_RULES = [
  { rule: "Score ≥ 85% & no failed gate", outcome: "Pass", color: "teal" },
  { rule: "50% to 84% score", outcome: "Partial (by weight)", color: "primary" },
  { rule: "Score < 50%", outcome: "Full refund", color: "fail" },
  { rule: "Near threshold, AI veto, or injection", outcome: "Human review", color: "review" },
];

export const DEMO_RECEIPT = {
  jobTitle: "5 product descriptions",
  price: "$20.00",
  score: "60%",
  decision: "PARTIAL",
  criteria: [
    { id: "schema", label: "JSON Schema (Descriptions v1)", status: "PASS", gate: true, weight: "20%" },
    { id: "length", label: "Word count 90-110 each", status: "FAIL", gate: true, weight: "20%" },
    { id: "terms", label: "Required terms ('organic', 'cotton')", status: "PASS", gate: false, weight: "20%" },
    { id: "tone", label: "Professional tone rubric", status: "FAIL", gate: false, weight: "20%" },
    { id: "coverage", label: "Topic coverage rubric", status: "PASS", gate: false, weight: "20%" },
  ],
  amounts: {
    workerPayout: "$10.80",
    clientRefund: "$8.00",
    platformFee: "$1.20",
    feeLabel: "placeholder 10% fee",
  },
  prevHash: "9f8a...4b12",
  hash: "e3b0...8821",
};

export const AUDIENCE_COPY = {
  h2: "Made for small, checkable jobs.",
  segments: [
    {
      tag: "Primary",
      title: "Freelancers and small clients",
      desc: "For jobs under a few hundred dollars: writing, data cleaning, translation, small scripts where escrow fees and dispute overhead kill margins.",
      primary: true,
    },
    {
      tag: "Secondary",
      title: "Developers running AI agents",
      desc: "Agents that hire other agents need a programmatic verify-before-release gateway to transact securely with zero prior reputation.",
      primary: false,
    },
    {
      tag: "Not for version 1",
      title: "Enterprise & Subjective Work",
      desc: "Large enterprise contracts, subjective creative work such as logo design, and anything that cannot be checked against criteria agreed up front.",
      muted: true,
    },
  ],
};

export const FINAL_CTA_COPY = {
  h2: "See it settle a sandbox payment.",
  sub: "Watch the three-minute demo, or run the five scenarios yourself.",
  disclaimer: "Sandbox prototype. No real money moves.",
};

export const FOOTER_COPY = {
  hackathonNote: "Built for the 'Build What's Next with PayPal and AI' hackathon.",
  trademarkDisclaimer: "Not affiliated with or endorsed by PayPal. PayPal is a trademark of PayPal, Inc.",
};
