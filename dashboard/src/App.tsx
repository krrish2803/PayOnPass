import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import NewJob from './pages/NewJob';
import JobDetail from './pages/JobDetail';
import Jobs from './pages/Jobs';
import ReviewQueue from './pages/ReviewQueue';
import Scorecard from './pages/Scorecard';
import Scenarios from './pages/Scenarios';
import Worker from './pages/Worker';

// AG Grid is heavy; load the ledger on demand so the first paint stays light.
const Ledger = lazy(() => import('./pages/Ledger'));

const nav = [
  { to: '/', label: 'New Job', end: true },
  { to: '/worker', label: 'Worker' },
  { to: '/scenarios', label: 'Scenarios' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/review', label: 'Review Queue' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/scorecard', label: 'Scorecard' },
];

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" />
          <div>
            <b>PayOnPass</b>
            <small>settlement console</small>
          </div>
        </div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}
          >
            {n.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          sandbox · verify-before-release
        </div>
      </aside>
      <main className="main">
        <Suspense fallback={<p className="sub">Loading…</p>}>
          <Routes>
            <Route path="/" element={<NewJob />} />
            <Route path="/worker" element={<Worker />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/scorecard" element={<Scorecard />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
