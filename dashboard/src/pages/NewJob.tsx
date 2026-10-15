import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getAgentKey, setAgentKey } from '../agentKey';
import type { AgentCreateResponse, Job } from '../types';

const DEFAULT_PROMPT =
  'Write 5 product descriptions for an organic cotton T-shirt shop, 90 to 110 words each, including the words "organic" and "cotton", professional tone.';

const DEFAULT_DELIVERABLE =
  '[{"title": "Organic Cotton Tee 1", "description": "A soft, breathable organic cotton tee ... 90-110 words ..."}]';

type Mode = 'human' | 'agent';

export default function NewJob() {
  const [mode, setMode] = useState<Mode>('human');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [priceCents, setPriceCents] = useState(2000);
  const [workerEmail, setWorkerEmail] = useState('sb-z476or53293310@personal.example.com');
  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [deliverable, setDeliverable] = useState(DEFAULT_DELIVERABLE);
  const [job, setJob] = useState<Job | null>(null);
  const [agentResult, setAgentResult] = useState<AgentCreateResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setKey(getAgentKey());
  }, []);

  const step = (m: string) => setLog((l) => [...l, m]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.createJob({
        prompt,
        price_cents: priceCents,
        worker_email: workerEmail || undefined,
        title: title || undefined,
      });
      setJob(created);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function agentCreate() {
    setBusy(true);
    setError(null);
    setAgentResult(null);
    setLog([]);
    setAgentKey(key);
    try {
      step(`POST /api/v1/agent/jobs  (X-API-Key …${suffix(key)})`);
      const created = await api.agentCreateJob(
        { prompt, price_cents: priceCents, worker_email: workerEmail || undefined, title: title || undefined, worker_kind: 'agent' },
        key,
      );
      setAgentResult(created);
      step(`→ ${created.job_id}  state=${created.state}  source=${created.matrix_source}`);
    } catch (e) {
      setError(String(e));
      step(`ERROR: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function runPipeline() {
    setBusy(true);
    setError(null);
    setAgentResult(null);
    setLog([]);
    setAgentKey(key);
    try {
      step(`POST /api/v1/agent/jobs  (X-API-Key …${suffix(key)})`);
      const created = await api.agentCreateJob(
        { prompt, price_cents: priceCents, worker_email: workerEmail || undefined, title: title || undefined, worker_kind: 'agent' },
        key,
      );
      setAgentResult(created);
      step(`→ ${created.job_id}  state=${created.state}  source=${created.matrix_source}`);

      step(`POST /api/v1/agent/jobs/${created.job_id}/fund`);
      const funded = await api.agentFundJob(created.job_id, key);
      step(`→ state=${funded.state}  mode=${funded.mode}${funded.approval_url ? '  (live: human approval required)' : ''}`);
      if (funded.approval_url) {
        step('live funding needs a human to approve — open the job to continue.');
        return;
      }

      step(`POST /api/v1/agent/jobs/${created.job_id}/submit`);
      const res = await api.agentSubmit(created.job_id, deliverable, key, 'agent-worker');
      step(`→ decision=${res.decision}  reason=${res.decision_reason}  score=${res.score_bp}`);
      step(`   state=${res.final_state || res.state}  receipt #${res.receipt.seq ?? '—'}`);
    } catch (e) {
      setError(String(e));
      step(`ERROR: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const matrix = job?.matrix ?? agentResult?.matrix ?? null;
  const jobIdOut = job?.id ?? agentResult?.job_id ?? null;
  const matrixSource = job?.matrix_source ?? agentResult?.matrix_source ?? null;
  const jobState = job?.state ?? agentResult?.state ?? null;
  const agent = mode === 'agent';

  return (
    <>
      <h1>New Job</h1>
      <p className="sub">
        Describe the work in plain English. A scoping agent turns it into a weighted acceptance
        matrix with hard gates and soft criteria; money is captured and held until the work passes.
      </p>

      <div className="pill-row" style={{ marginBottom: 14 }}>
        <button className={mode === 'human' ? '' : 'ghost'} onClick={() => setMode('human')} disabled={busy}>
          Human console
        </button>
        <button className={mode === 'agent' ? '' : 'ghost'} onClick={() => setMode('agent')} disabled={busy}>
          Agent API (X-API-Key)
        </button>
      </div>

      {agent && (
        <div className="panel">
          <h2>Agent credential</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            Drives the keyed <span className="mono">/api/v1/agent/*</span> endpoints so a worker
            agent can create, fund and submit without a human in the loop. Stored only in this
            browser; sent solely as the <span className="mono">X-API-Key</span> header. Required
            only if the server sets <span className="mono">AGENT_API_KEYS</span>.
          </p>
          <label>X-API-Key</label>
          <input
            type="password"
            value={key}
            placeholder="demo-agent-key"
            onChange={(e) => {
              setKey(e.target.value);
              setAgentKey(e.target.value);
            }}
          />
        </div>
      )}

      <div className="panel">
        <label>Prompt</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row">
          <div>
            <label>Price (cents)</label>
            <input
              type="number"
              value={priceCents}
              min={1}
              onChange={(e) => setPriceCents(Number(e.target.value))}
            />
          </div>
          <div>
            <label>{agent ? 'Agent identity (worker email)' : 'Worker email'}</label>
            <input value={workerEmail} onChange={(e) => setWorkerEmail(e.target.value)} />
          </div>
          <div>
            <label>Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        {agent && (
          <>
            <label>Deliverable content (the artifact the agent submits)</label>
            <textarea value={deliverable} onChange={(e) => setDeliverable(e.target.value)} />
          </>
        )}

        <div style={{ marginTop: 8 }}>
          {!agent ? (
            <button onClick={create} disabled={busy || !prompt.trim()}>
              {busy ? 'Scoping…' : 'Create job'}
            </button>
          ) : (
            <>
              <button className="ghost" onClick={agentCreate} disabled={busy || !prompt.trim()}>
                {busy ? 'Working…' : 'Create via agent API'}
              </button>{' '}
              <button onClick={runPipeline} disabled={busy || !prompt.trim() || !deliverable.trim()}>
                {busy ? 'Running…' : 'Create → Fund → Submit (keyed)'}
              </button>
            </>
          )}
        </div>
        {error && <div className="err">{error}</div>}
      </div>

      {log.length > 0 && (
        <div className="panel">
          <h2>Agent pipeline</h2>
          <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{log.join('\n')}</pre>
        </div>
      )}

      {matrix && jobIdOut && (
        <div className="panel">
          <h2>
            Matrix <span className="muted">·</span> {matrix.job_title}{' '}
            {jobState && <span className={`badge ${jobState}`}>{jobState}</span>}
          </h2>
          <p className="sub mono">
            job {jobIdOut} · source {matrixSource ?? 'offline-demo'}
            {agentResult?.funding ? ` · funding ${agentResult.funding.mode}` : ''}
          </p>
          <table>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Kind</th>
                <th>Gate</th>
                <th>Weight</th>
                <th>Rule / rubric</th>
              </tr>
            </thead>
            <tbody>
              {matrix.criteria.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td>{c.kind}</td>
                  <td>{c.gate ? 'yes' : 'no'}</td>
                  <td className="mono">{(c.weight_bp / 100).toFixed(0)}%</td>
                  <td className="mono">
                    {c.kind === 'rule'
                      ? `${c.type}${c.min !== undefined ? ` min=${c.min}` : ''}${c.max !== undefined ? ` max=${c.max}` : ''}${
                          c.terms ? ` terms=[${c.terms.join(', ')}]` : ''
                        }`
                      : c.rubric}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => navigate(`/jobs/${jobIdOut}`)}>Open job →</button>
        </div>
      )}
    </>
  );
}

function suffix(key: string): string {
  return key ? key.slice(-4) : 'none';
}
