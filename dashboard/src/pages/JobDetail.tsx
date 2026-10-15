import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { FundResponse, Job, MoneyEvent, PaypalCall, Receipt, SubmitResponse, TamperResult } from '../types';
import { bp, short, usd } from '../format';

export default function JobDetail() {
  const { id = '' } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<MoneyEvent[]>([]);
  const [calls, setCalls] = useState<PaypalCall[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tamperRes, setTamperRes] = useState<TamperResult | null>(null);
  const [openCall, setOpenCall] = useState<number | null>(null);

  const [content, setContent] = useState('');
  const [fund, setFund] = useState<FundResponse | null>(null);
  const [submitRes, setSubmitRes] = useState<SubmitResponse | null>(null);
  const [reviewScore, setReviewScore] = useState(8000);

  const load = useCallback(async () => {
    try {
      const [j, ev, rc, pc] = await Promise.all([
        api.getJob(id),
        api.ledgerEvents(id),
        api.receipts(id),
        api.paypalCalls(id),
      ]);
      setJob(j);
      setEvents(ev);
      setReceipts(rc.receipts);
      setCalls(pc);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!job) {
    return (
      <>
        <h1>Job</h1>
        {error ? <div className="err">{error}</div> : <p className="sub">Loading…</p>}
      </>
    );
  }

  const canFund = job.state === 'CREATED';
  const canCapture = job.state === 'FUNDED' && !!job.paypal?.order_id;
  const canSubmit = job.state === 'FUNDED' || job.state === 'DELIVERED';
  const inReview = job.state === 'NEEDS_REVIEW';

  return (
    <>
      <h1>
        {job.title || 'Job'} <span className={`badge ${job.state}`}>{job.state}</span>
      </h1>
      <p className="sub mono">
        {job.id} · {usd(job.price_cents)} {job.currency} · worker {job.worker_email || '—'} ({job.worker_kind || 'human'}) · v{job.version}
        {job.review_reason ? ` · review: ${job.review_reason}` : ''}
      </p>

      <div className="pill-row" style={{ marginBottom: 16 }}>
        <button className="ghost" onClick={() => run(async () => setNotice(await chainLine()))} disabled={busy}>
          Verify chain
        </button>
        <button
          className="danger"
          onClick={() =>
            run(async () => {
              const r = await api.tamper();
              setTamperRes(r);
              setNotice(`tamper: chain ${r.before.valid ? 'valid' : 'invalid'} → ${r.after.valid ? 'valid' : 'invalid'}`);
            })
          }
          disabled={busy}
          title="Demo: edit a sealed receipt, then re-verify"
        >
          Tamper a receipt (demo)
        </button>
        {canFund && (
          <button onClick={() => run(async () => setFund(await api.fundJob(id)))} disabled={busy}>
            Fund job
          </button>
        )}
        {canCapture && (
          <button className="ghost" onClick={() => run(async () => { const r = await api.captureReturn(id); setNotice(`captured=${r.captured}`); })} disabled={busy}>
            Confirm PayPal capture
          </button>
        )}
      </div>

      {fund?.approval_url && (
        <div className="panel">
          <b>Buyer approval required.</b>
          <p className="muted" style={{ fontSize: 13 }}>
            Sandbox funding is live. Open the approval URL, approve, then the return URL executes the
            capture.
          </p>
          <a href={fund.approval_url} target="_blank" rel="noreferrer" className="mono">
            {fund.approval_url}
          </a>
        </div>
      )}
      {notice && <div className="ok">{notice}</div>}
      {tamperRes && (
        <div className="panel">
          <h2>Tamper test</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            One sealed receipt was edited after the fact. The hash chain detects it: the recomputed
            hash no longer matches.
          </p>
          <dl className="kv">
            <dt>tampered receipt</dt><dd className="mono">#{tamperRes.tampered.seq} {short(tamperRes.tampered.hash, 24)}</dd>
            <dt>chain before</dt>
            <dd><span className={`badge ${tamperRes.before.valid ? 'SUCCEEDED' : 'FAILED'}`}>{tamperRes.before.valid ? 'valid' : 'broken'}</span></dd>
            <dt>chain after</dt>
            <dd><span className={`badge ${tamperRes.after.valid ? 'SUCCEEDED' : 'FAILED'}`}>{tamperRes.after.valid ? 'valid' : 'broken'}</span></dd>
          </dl>
        </div>
      )}
      {error && <div className="err">{error}</div>}

      <div className="panel">
        <h2>Capture</h2>
        <dl className="kv">
          <dt>state</dt><dd>{job.state}</dd>
          <dt>captured</dt><dd>{usd(job.captured_cents)}</dd>
          <dt>paypal fee</dt><dd>{usd(job.paypal_fee_cents)}</dd>
          <dt>order_id</dt><dd>{String(job.paypal?.order_id ?? '—')}</dd>
          <dt>capture_id</dt><dd>{String(job.paypal?.capture_id ?? '—')}</dd>
        </dl>
      </div>

      {canSubmit && (
        <div className="panel">
          <h2>Submit deliverable</h2>
          <label>Artifact content (the raw JSON array the worker delivered)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder='[{"title":"...","description":"..."}]' />
          <button onClick={() => run(async () => setSubmitRes(await api.submit(id, content)))} disabled={busy || !content.trim()}>
            Submit &amp; verify
          </button>
          {submitRes && (
            <div style={{ marginTop: 14 }}>
              <div className="pill-row">
                <span className={`badge ${submitRes.decision}`}>{submitRes.decision}</span>
                <span className="mono muted">{submitRes.decision_reason}</span>
                <span className="mono">score {bp(submitRes.score_bp)}</span>
              </div>
              <table style={{ marginTop: 10 }}>
                <thead><tr><th>Amount</th><th>Cents</th><th>USD</th></tr></thead>
                <tbody>
                  {Object.entries(submitRes.amounts_cents).map(([k, v]) => (
                    <tr key={k}><td className="mono">{k}</td><td className="mono">{v}</td><td className="mono">{usd(v)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="muted mono" style={{ fontSize: 12 }}>
                receipt #{submitRes.receipt.seq} hash {short(submitRes.receipt.hash)} prev {short(submitRes.receipt.prev_hash)}
              </p>
            </div>
          )}
        </div>
      )}

      {inReview && (
        <div className="panel">
          <h2>Human review · {job.review_reason}</h2>
          <label>Adjust score (basis points, used by ADJUST)</label>
          <input type="number" value={reviewScore} min={0} max={10000} step={500} onChange={(e) => setReviewScore(Number(e.target.value))} />
          <div style={{ marginTop: 6 }}>
            <button onClick={() => run(async () => { await api.decide(id, 'APPROVE'); setNotice('approved'); })} disabled={busy}>Approve (full pass)</button>
            <button className="warn" onClick={() => run(async () => { await api.decide(id, 'ADJUST', reviewScore, 'reviewer adjustment'); setNotice('adjusted'); })} disabled={busy}>Adjust</button>
            <button className="danger" onClick={() => run(async () => { await api.decide(id, 'REJECT'); setNotice('rejected'); })} disabled={busy}>Reject (refund)</button>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Money events</h2>
        <table>
          <thead><tr><th>Kind</th><th>Status</th><th>Amount</th><th>PayPal ids</th><th>Request id</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td className="mono">{e.kind}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                <td className="mono">{usd(e.amount_cents)}</td>
                <td className="mono">{e.paypal_ids.join(', ') || '—'}</td>
                <td className="mono">{short(e.request_id, 16)}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="muted">No money has moved yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>PayPal calls</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Every request PayOnPass sent to PayPal for this job: the idempotency key
          (<span className="mono">PayPal-Request-Id</span>), the outcome, and PayPal&rsquo;s own fee. Expand a row for the raw response.
        </p>
        <table>
          <thead><tr><th>Kind</th><th>Status</th><th>Amount</th><th>Fee</th><th>Mode</th><th>Request id</th><th></th></tr></thead>
          <tbody>
            {calls.map((c, i) => (
              <Fragment key={i}>
                <tr>
                  <td className="mono">{c.kind}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td className="mono">{usd(c.amount_cents)}</td>
                  <td className="mono">{usd(c.fee_cents)}</td>
                  <td className="mono">{c.mode || 'real'}</td>
                  <td className="mono" style={{ wordBreak: 'break-all', maxWidth: 240 }} title={c.request_id || ''}>{c.request_id || '—'}</td>
                  <td>
                    <button className="ghost" onClick={() => setOpenCall(openCall === i ? null : i)}>
                      {openCall === i ? 'Hide' : 'Raw'}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ paddingTop: 0 }}>
                    <div className="mono muted" style={{ fontSize: 12 }}>
                      ids: {c.paypal_ids.join(', ') || '—'}
                      {c.error ? ` · error: ${c.error}` : ''}
                      {c.debug_id ? ` · debug ${c.debug_id}` : ''}
                    </div>
                    {openCall === i && (
                      <pre className="mono" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{JSON.stringify(c.response ?? {}, null, 2)}</pre>
                    )}
                  </td>
                </tr>
              </Fragment>
            ))}
            {calls.length === 0 && <tr><td colSpan={7} className="muted">No PayPal calls yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Sealed receipts</h2>
        <table>
          <thead><tr><th>#</th><th>Kind</th><th>Hash</th><th>Prev</th></tr></thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.seq}>
                <td className="mono">{r.seq}</td>
                <td className="mono">{r.kind}</td>
                <td className="mono">{short(r.hash, 20)}</td>
                <td className="mono">{short(r.prev_hash, 20)}</td>
              </tr>
            ))}
            {receipts.length === 0 && <tr><td colSpan={4} className="muted">Nothing sealed yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Link to="/jobs">← All jobs</Link>
    </>
  );
}

async function chainLine(): Promise<string> {
  const r = await api.verifyChain();
  return `chain valid=${r.valid} count=${r.length}`;
}
