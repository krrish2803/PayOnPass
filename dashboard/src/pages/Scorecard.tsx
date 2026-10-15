import { useEffect, useState } from 'react';
import { api } from '../api';

interface CaseRow {
  id: string;
  name: string;
  rule_results: Record<string, boolean>;
  injection: boolean;
  injection_evidence?: string;
  verdict: string;
}

interface Scorecard {
  available: boolean;
  reason?: string;
  total?: number;
  by_verdict?: Record<string, number>;
  attacks_total?: number;
  attacks_held_for_review?: number;
  cases: CaseRow[];
}

export default function Scorecard() {
  const [data, setData] = useState<Scorecard | null>(null);
  const [chain, setChain] = useState<{ valid: boolean; length: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([
          fetch(`${api.base}/verifier/scorecard`).then((r) => r.json() as Promise<Scorecard>),
          api.verifyChain(),
        ]);
        setData(s);
        setChain(c as { valid: boolean; length: number });
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  return (
    <>
      <h1>Verifier Scorecard</h1>
      <p className="sub">
        The adversarial suite's own output, served live. Every hostile or degenerate delivery and
        what the deterministic layer concluded.
      </p>
      {error && <div className="err">{error}</div>}

      <div className="panel">
        <h2>Integrity</h2>
        <p className="mono">
          receipt chain:{' '}
          {chain ? (
            chain.valid ? (
              <span className="badge SUCCEEDED">valid{chain.length ? ` · ${chain.length} receipts` : ''}</span>
            ) : (
              <span className="badge FAILED">broken</span>
            )
          ) : (
            '…'
          )}
        </p>
      </div>

      {data && !data.available && <div className="panel muted">{data.reason}</div>}

      {data?.available && (
        <>
          <div className="panel">
            <div className="row">
              <Stat label="cases" value={String(data.total)} />
              <Stat label="pass" value={String(data.by_verdict?.PASS ?? 0)} />
              <Stat label="fail" value={String(data.by_verdict?.FAIL ?? 0)} />
              <Stat label="to review" value={String(data.by_verdict?.REVIEW ?? 0)} />
              <Stat label="injection attacks" value={String(data.attacks_total)} />
              <Stat label="attacks held" value={`${data.attacks_held_for_review}/${data.attacks_total}`} />
            </div>
          </div>

          <div className="panel">
            <table>
              <thead>
                <tr><th>ID</th><th>Case</th><th>Rules</th><th>Injection</th><th>Verdict</th></tr>
              </thead>
              <tbody>
                {data.cases.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td>{c.name}</td>
                    <td className="mono">
                      {Object.entries(c.rule_results)
                        .map(([k, v]) => `${k}:${v ? '✓' : '✗'}`)
                        .join('  ')}
                    </td>
                    <td className="mono">{c.injection ? 'yes' : 'no'}</td>
                    <td><span className={`badge ${c.verdict}`}>{c.verdict}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div className="muted mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>{label}</div>
      <div className="mono" style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}
