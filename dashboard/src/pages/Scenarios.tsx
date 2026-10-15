import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Scenario, ScenarioRunResult } from '../types';
import { bp, usd } from '../format';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [runs, setRuns] = useState<Record<string, ScenarioRunResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.scenarios();
        setScenarios(r.scenarios);
        setEnabled(r.enabled);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  async function run(sid: string) {
    setBusy(sid);
    setError(null);
    try {
      const res = await api.runScenario(sid);
      setRuns((prev) => ({ ...prev, [sid]: res }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function complete(sid: string, jobId: string) {
    setBusy(sid);
    setError(null);
    try {
      const res = await api.completeScenario(jobId);
      setRuns((prev) => ({ ...prev, [sid]: res }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runAll() {
    for (const s of scenarios) {
      // sequential so the demo reads top-to-bottom and the ledger stays ordered
      await run(s.id);
    }
  }

  return (
    <>
      <h1>Scenarios</h1>
      <p className="sub">
        One click drives a seeded job through the full pipeline (create → fund → verify → settle).
        Real LLM matrix, real PayPal funding, real payout/refund. When the server is in live funding
        mode you approve in PayPal between <b>Run</b> and <b>Complete</b>.
      </p>
      {!enabled && (
        <div className="err">Demo endpoints are disabled on this server (set ENABLE_DEV_TOOLS=true).</div>
      )}
      {error && <div className="err">{error}</div>}

      <div className="pill-row" style={{ marginBottom: 14 }}>
        <button onClick={runAll} disabled={!!busy || !enabled}>Run all S1–S5</button>
      </div>

      {scenarios.map((s) => {
        const r = runs[s.id];
        return (
          <div className="panel" key={s.id}>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <h2 style={{ margin: 0 }}>
                <span className="mono">{s.id}</span> · {s.name}
              </h2>
              <button onClick={() => run(s.id)} disabled={!!busy || !enabled}>
                {busy === s.id ? 'Running…' : 'Run'}
              </button>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>{s.summary}</p>
            <p className="muted mono" style={{ fontSize: 12 }}>expected: {s.expected}</p>

            {r && r.needs_approval && (
              <div style={{ marginTop: 8 }}>
                <p className="muted mono" style={{ fontSize: 12 }}>
                  state {r.state} · awaiting buyer approval
                </p>
                <p style={{ marginTop: 6 }}>
                  <a className="mono" href={r.approval_url ?? '#'} target="_blank" rel="noreferrer">
                    Open PayPal approval →
                  </a>{' '}
                  then
                  <button
                    style={{ marginLeft: 8 }}
                    onClick={() => complete(s.id, r.job_id)}
                    disabled={!!busy}
                  >
                    {busy === s.id ? 'Completing…' : 'I approved → Complete'}
                  </button>
                </p>
                <p style={{ marginTop: 8 }}>
                  <Link className="mono" to={`/jobs/${r.job_id}`}>open job {r.job_id.slice(0, 10)} →</Link>
                </p>
              </div>
            )}

            {r && !r.needs_approval && r.engine && (
              <div style={{ marginTop: 6 }}>
                <div className="pill-row">
                  <span className={`badge ${r.engine.decision}`}>{r.engine.decision}</span>
                  <span className="mono muted">{r.engine.reason}</span>
                  <span className="mono">score {bp(r.engine.score_bp)}</span>
                  {r.review && (
                    <span className="mono">→ review {r.review.decision}{r.review.score_bp != null ? ` ${bp(r.review.score_bp)}` : ''}</span>
                  )}
                  <span className={`badge ${r.state}`}>{r.state}</span>
                </div>
                <table style={{ marginTop: 10 }}>
                  <thead><tr><th>Amount</th><th>Cents</th><th>USD</th></tr></thead>
                  <tbody>
                    {Object.entries(r.amounts_cents ?? {}).map(([k, v]) => (
                      <tr key={k}><td className="mono">{k}</td><td className="mono">{v}</td><td className="mono">{usd(v)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: 8 }}>
                  <Link className="mono" to={`/jobs/${r.job_id}`}>open job {r.job_id.slice(0, 10)} →</Link>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
