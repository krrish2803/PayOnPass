import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Job } from '../types';
import { usd } from '../format';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setJobs(await api.listJobs());
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <h1>Jobs</h1>
      <p className="sub">Every job, newest actions first. Auto-refreshes every 5s.</p>
      {error && <div className="err">{error}</div>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>State</th>
              <th>Reason</th>
              <th>Price</th>
              <th>Captured</th>
              <th>PayPal fee</th>
              <th>Worker</th>
            </tr>
          </thead>
          <tbody>
            {(jobs ?? []).map((j) => (
              <tr key={j.id}>
                <td>
                  <Link className="mono" to={`/jobs/${j.id}`}>
                    {j.title || j.id.slice(0, 10)}
                  </Link>
                </td>
                <td>
                  <span className={`badge ${j.state}`}>{j.state}</span>
                </td>
                <td className="mono">{j.review_reason || '—'}</td>
                <td className="mono">{usd(j.price_cents)}</td>
                <td className="mono">{usd(j.captured_cents)}</td>
                <td className="mono">{usd(j.paypal_fee_cents)}</td>
                <td className="mono">{j.worker_kind || 'human'}</td>
              </tr>
            ))}
            {jobs && jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No jobs yet. Create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
