import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ReviewItem } from '../types';

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.reviews());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <>
      <h1>Review Queue</h1>
      <p className="sub">
        Jobs the verifier refused to auto-settle: injection, borderline scores, gate/audit
        disagreement, PayPal failures, or an unusable AI audit. Each decision is sealed.
      </p>
      {error && <div className="err">{error}</div>}
      <div className="panel">
        <table>
          <thead>
            <tr><th>Job</th><th>Reason</th><th>Status</th><th>Opened</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.job_id}>
                <td className="mono">{r.job_id.slice(0, 12)}</td>
                <td><span className="badge NEEDS_REVIEW">{r.reason || 'MANUAL_REVIEW'}</span></td>
                <td className="mono">{r.status}</td>
                <td className="mono">{r.created_at?.slice(0, 19).replace('T', ' ')}</td>
                <td><Link to={`/jobs/${r.job_id}`}>open →</Link></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="muted">Nothing waiting. The verifier auto-settled everything it could.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
