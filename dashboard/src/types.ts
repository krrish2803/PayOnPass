export type JobState =
  | 'CREATED'
  | 'FUNDED'
  | 'DELIVERED'
  | 'NEEDS_REVIEW'
  | 'SETTLING'
  | 'SETTLED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface Criterion {
  id: string;
  description?: string;
  kind: 'rule' | 'llm';
  weight_bp: number;
  gate?: boolean;
  type?: string;
  min?: number;
  max?: number;
  terms?: string[];
  patterns?: string[];
  rubric?: string;
  schema_ref?: string;
}

export interface AcceptanceMatrix {
  job_title: string;
  price_cents: number;
  currency: string;
  deliverable_format: string;
  criteria: Criterion[];
}

export interface Job {
  id: string;
  state: JobState;
  review_reason?: string | null;
  title?: string | null;
  prompt: string;
  price_cents: number;
  currency: string;
  matrix?: AcceptanceMatrix | null;
  worker_email?: string | null;
  worker_kind?: string | null;
  matrix_source?: string | null;
  paypal?: Record<string, unknown>;
  captured_cents?: number | null;
  paypal_fee_cents?: number | null;
  version?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FundResponse {
  job_id: string;
  state: string;
  approval_url?: string | null;
  mode: string;
  order_id?: string;
}

export interface AgentCreateResponse {
  job_id: string;
  state: string;
  price_cents: number;
  matrix?: AcceptanceMatrix | null;
  matrix_source?: string | null;
  funding?: { mode: string };
}

export interface SubmitResponse {
  job_id: string;
  state: string;
  final_state: string;
  decision: string;
  decision_reason: string;
  score_bp: number;
  amounts_cents: Record<string, number>;
  receipt: { hash?: string; seq?: number; prev_hash?: string };
  matrix_source?: string;
}

export interface MoneyEvent {
  job_id: string;
  kind: string;
  status: string;
  request_id?: string;
  amount_cents: number;
  paypal_ids: string[];
}

export interface ReviewItem {
  job_id: string;
  reason?: string;
  created_at?: string;
  status?: string;
}

export interface Receipt {
  job_id: string;
  kind: string;
  seq: number;
  hash: string;
  prev_hash: string;
  body_json?: string;
}

export interface ChainResult {
  valid: boolean;
  length: number;
  receipts?: Receipt[];
  [k: string]: unknown;
}

export interface MasterRollup {
  money_events_totals: Record<string, Record<string, number>>;
  captured_cents: number;
  paypal_fees_cents: number;
  receipt_count: number;
  chain_ok: boolean;
}

export interface PaypalCall {
  job_id: string;
  kind: string;
  status: string;
  request_id?: string;
  amount_cents: number;
  paypal_ids: string[];
  fee_cents?: number | null;
  mode?: string | null;
  error?: string | null;
  debug_id?: string | null;
  created_at?: string | null;
  response?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  summary: string;
  expected: string;
}

export interface ScenarioRunResult {
  scenario: Scenario;
  job_id: string;
  engine: { decision: string; reason: string; score_bp: number } | null;
  review: { decision: string; score_bp: number | null } | null;
  state: string;
  final_state?: string;
  amounts_cents: Record<string, number> | null;
  matrix_source?: string | null;
  needs_approval: boolean;
  approval_url: string | null;
  mode?: string;
}

export interface TamperResult {
  tampered: { job_id?: string; seq?: number; hash?: string };
  before: { valid: boolean; length: number };
  after: { valid: boolean; length: number };
}
