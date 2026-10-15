import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Job, MoneyEvent, SubmitResponse } from '../types';
import { bp, usd } from '../format';

export default function Worker() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<MoneyEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [j, ev] = await Promise.all([api.listJobs(), api.ledgerEvents()]);
      setJobs(j);
      setEvents(ev);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.submit(selected, content, 'worker');
      setResult(res);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const available = jobs.filter((j) => j.state === 'FUNDED');
  const payouts = events.filter((e) => e.kind === 'PAYOUT');
  const jobById = (id: string) => jobs.find((j) => j.id === id);

  return (
    <>
      <h1>Worker</h1>
      <p className="sub">
        The other side of the job. Deliver funded work, then watch the verifier decide and the
        payout land. (Demo console — no auth.)
      </p>
      {error && <div className="err">{error}</div>}

      <div className="panel">
        <h2>Available work</h2>
        <p className="muted" style={{ fontSize: 13 }}>Jobs that are funded and waiting for a deliverable.</p>
        <table>
          <thead><tr><th>Job</th><th>Worker</th><th>Price</th><th></th></tr></thead>
          <tbody>
            {available.map((j) => (
              <tr key={j.id}>
                <td><Link className="mono" to={`/jobs/${j.id}`}>{j.title || j.id.slice(0, 10)}</Link></td>
                <td className="mono">{j.worker_email || '—'} ({j.worker_kind || 'human'})</td>
                <td className="mono">{usd(j.price_cents)}</td>
                <td>
                  <button className={selected === j.id ? '' : 'ghost'} onClick={() => { setSelected(j.id); setResult(null); }}>
                    {selected === j.id ? 'Selected' : 'Deliver'}
                  </button>
                </td>
              </tr>
            ))}
            {available.length === 0 && <tr><td colSpan={4} className="muted">Nothing awaiting delivery.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="panel">
          <h2>Deliver · <span className="mono">{selected.slice(0, 12)}</span></h2>
          <label>Your deliverable (the raw artifact, e.g. a JSON array)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder='[{"title":"...","description":"..."}]' />
          <button onClick={submit} disabled={busy || !content.trim()}>{busy ? 'Submitting…' : 'Submit to verifier'}</button>

          {result && (
            <div style={{ marginTop: 14 }}>
              <div className="pill-row">
                <span className={`badge ${result.decision}`}>{result.decision}</span>
                <span className="mono muted">{result.decision_reason}</span>
                <span className="mono">score {bp(result.score_bp)}</span>
              </div>
              <table style={{ marginTop: 10 }}>
                <thead><tr><th>Amount</th><th>USD</th></tr></thead>
                <tbody>
                  <tr><td className="mono">you get (worker_payout)</td><td className="mono">{usd(result.amounts_cents.worker_payout)}</td></tr>
                  <tr><td className="mono">client refund</td><td className="mono">{usd(result.amounts_cents.client_refund)}</td></tr>
                  <tr><td className="mono">platform fee</td><td className="mono">{usd(result.amounts_cents.fee)}</td></tr>
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: 12 }}>
                final state: <span className={`badge ${result.final_state || result.state}`}>{result.final_state || result.state}</span>
                {result.final_state === 'NEEDS_REVIEW' ? ' — a human will review before any payout.' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Payouts</h2>
        <table>
          <thead><tr><th>Job</th><th>Worker</th><th>Amount</th><th>Status</th><th>PayPal ids</th></tr></thead>
          <tbody>
            {payouts.map((e, i) => {
              const j = jobById(e.job_id);
              return (
                <tr key={i}>
                  <td><Link className="mono" to={`/jobs/${e.job_id}`}>{e.job_id.slice(0, 10)}</Link></td>
                  <td className="mono">{j?.worker_email || '—'}</td>
                  <td className="mono">{usd(e.amount_cents)}</td>
                  <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                  <td className="mono">{e.paypal_ids.join(', ') || '—'}</td>
                </tr>
              );
            })}
            {payouts.length === 0 && <tr><td colSpan={5} className="muted">No payouts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
