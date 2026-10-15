export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: "Is this real money?",
    answer: "No. It runs on the PayPal sandbox with test accounts. No real money moves.",
  },
  {
    question: "Is this escrow?",
    answer: "In the sandbox, the client's payment is captured into a platform PayPal balance and held there. It is not regulated escrow. Holding real money in production would need PayPal's marketplace products and the right licensing.",
  },
  {
    question: "Can the AI be tricked into paying for bad work?",
    answer: "The AI never outputs a score. Rule checks run first and cannot be overridden, the AI audit can only lower a result, a pattern scan and the AI flag suspected injection, and flagged jobs go to a human. The project includes a test suite of hostile submissions.",
  },
  {
    question: "What if a payment call fails or is retried?",
    answer: "Every payout and refund carries an idempotency key, and the job stays in a SETTLING state until PayPal confirms, so a retry cannot pay twice.",
  },
  {
    question: "Who pays the fee?",
    answer: "The fee is shown on every job in the ledger. The demo uses a placeholder 10%, to be set before any real use.",
  },
  {
    question: "What kinds of jobs work?",
    answer: "Jobs whose result can be checked against criteria agreed up front: word counts, formats, required terms, schemas, and clear soft rubrics.",
  },
  {
    question: "What happens in a borderline case?",
    answer: "The job pauses and a human reviewer approves, rejects, or adjusts the split. The decision gets its own receipt.",
  },
  {
    question: "Can an AI agent use it?",
    answer: "Yes. A JSON API lets an agent create a job, submit work, and read the settlement, and a Postman collection is included.",
  },
  {
    question: "Is the code open source?",
    answer: "Yes, MIT-licensed on GitHub.",
  },
  {
    question: "How is it different from Upwork or Fiverr?",
    answer: "It is not a talent marketplace. It only handles the part where money waits for proof, automatically, for small jobs and for agents.",
  },
];
