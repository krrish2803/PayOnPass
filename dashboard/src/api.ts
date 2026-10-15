import type {
  AgentCreateResponse,
  ChainResult,
  FundResponse,
  Job,
  MasterRollup,
  MoneyEvent,
  PaypalCall,
  Receipt,
  ReviewItem,
  Scenario,
  ScenarioRunResult,
  SubmitResponse,
  TamperResult,
} from './types';

// Same-origin by default (the dashboard is served by FastAPI at /app).
// In `vite dev`, set VITE_API_BASE=http://localhost:8000.
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : text;
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return data as T;
}

export const api = {
  base: BASE,

  health: () => req<{ status: string; database: string; reconciler: string }>('/health'),

  createJob: (body: {
    prompt: string;
    price_cents?: number;
    worker_email?: string;
    title?: string;
  }) => req<Job>('/jobs', { method: 'POST', body: JSON.stringify(body) }),

  listJobs: () => req<Job[]>('/jobs'),

  getJob: (id: string) => req<Job>(`/jobs/${id}`),

  fundJob: (id: string) => req<FundResponse>(`/jobs/${id}/fund`, { method: 'POST' }),

  captureReturn: (id: string) =>
    req<{ job_id: string; state: string; captured: boolean }>(
      `/paypal/return?job_id=${encodeURIComponent(id)}`,
    ),

  submit: (id: string, content: string, submitted_by = 'worker') =>
    req<SubmitResponse>(`/jobs/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ content, submitted_by }),
    }),

  receipts: (id: string) =>
    req<{ job_id: string; count: number; receipts: Receipt[] }>(`/jobs/${id}/receipts`),

  ledgerEvents: (jobId?: string) =>
    req<MoneyEvent[]>(`/ledger/events${jobId ? `?job_id=${encodeURIComponent(jobId)}` : ''}`),

  // Every PayPal money request for a job: request id, status, fee, raw response.
  paypalCalls: (jobId: string) => req<PaypalCall[]>(`/jobs/${encodeURIComponent(jobId)}/paypal-calls`),

  master: () => req<MasterRollup>('/master'),

  verifyChain: () => req<ChainResult>('/verify-chain'),

  reviews: () => req<ReviewItem[]>('/reviews'),

  decide: (id: string, decision: 'APPROVE' | 'ADJUST' | 'REJECT', score_bp?: number, note?: string) =>
    req<{ job_id: string; state: string }>(`/review/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, score_bp, note }),
    }),

  // Agent API (X-API-Key): a worker agent can create, fund and submit without a
  // human in the loop. Same shapes as the console routes, but keyed.
  agentCreateJob: (
    body: { prompt: string; price_cents?: number; worker_email?: string; title?: string; worker_kind?: string },
    key: string,
  ) => req<AgentCreateResponse>('/api/v1/agent/jobs', { method: 'POST', headers: { 'X-API-Key': key }, body: JSON.stringify(body) }),

  agentFundJob: (id: string, key: string) =>
    req<FundResponse>(`/api/v1/agent/jobs/${id}/fund`, { method: 'POST', headers: { 'X-API-Key': key } }),

  agentSubmit: (id: string, content: string, key: string, submitted_by = 'agent') =>
    req<SubmitResponse>(`/api/v1/agent/jobs/${id}/submit`, {
      method: 'POST',
      headers: { 'X-API-Key': key },
      body: JSON.stringify({ content, submitted_by }),
    }),

  // Demo affordances (server must set ENABLE_DEV_TOOLS=true).
  scenarios: () =>
    req<{ enabled: boolean; scenarios: Scenario[] }>('/demo/scenarios'),

  runScenario: (sid: string) =>
    req<ScenarioRunResult>(`/demo/scenarios/${encodeURIComponent(sid)}/run`, { method: 'POST' }),

  // Step 2 of the live flow: after the buyer approves and the capture lands.
  completeScenario: (jobId: string) =>
    req<ScenarioRunResult>(`/demo/scenarios/complete/${encodeURIComponent(jobId)}`, { method: 'POST' }),

  tamper: () => req<TamperResult>('/demo/tamper', { method: 'POST' }),
};
