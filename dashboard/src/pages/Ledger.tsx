import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { api } from '../api';
import type { MasterRollup, MoneyEvent } from '../types';
import { short, usd } from '../format';

function StatusCell(p: ICellRendererParams<MoneyEvent>) {
  return <span className={`badge ${p.value}`}>{p.value}</span>;
}

export default function Ledger() {
  const [events, setEvents] = useState<MoneyEvent[]>([]);
  const [master, setMaster] = useState<MasterRollup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [ev, m, chain] = await Promise.all([api.ledgerEvents(), api.master(), api.verifyChain()]);
      setEvents(ev);
      setMaster(m);
      setValid(chain.valid);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const cols = useMemo<ColDef<MoneyEvent>[]>(
    () => [
      { field: 'job_id', headerName: 'Job', flex: 1, minWidth: 140 },
      { field: 'kind', headerName: 'Kind', width: 110 },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        cellRenderer: StatusCell,
      },
      { field: 'amount_cents', headerName: 'Cents', width: 100, type: 'numericColumn' },
      {
        headerName: 'USD',
        width: 100,
        valueGetter: (p) => usd(p.data?.amount_cents),
      },
      {
        headerName: 'PayPal ids',
        flex: 1,
        minWidth: 160,
        valueGetter: (p) => (p.data?.paypal_ids ?? []).join(', '),
      },
      {
        headerName: 'Idempotency key',
        flex: 1,
        minWidth: 160,
        valueGetter: (p) => short(p.data?.request_id, 18),
      },
    ],
    [],
  );

  return (
    <>
      <h1>Ledger</h1>
      <p className="sub">
        Every money event with its PayPal ids and idempotency key. The rollup reconciles captured
        funds against worker payout + client refund + platform fee.
      </p>
      {error && <div className="err">{error}</div>}

      {master && (
        <div className="panel">
          <h2>
            Rollup ·{' '}
            {valid === null ? (
              '…'
            ) : valid ? (
              <span className="badge SUCCEEDED">chain valid</span>
            ) : (
              <span className="badge FAILED">CHAIN BROKEN</span>
            )}
          </h2>
          <div className="row">
            <Stat label="receipts" value={String(master.receipt_count)} />
            <Stat label="captured" value={usd(master.captured_cents)} />
            <Stat label="paypal fees" value={usd(master.paypal_fees_cents)} />
            {Object.entries(master.money_events_totals).map(([kind, byStatus]) => (
              <Stat
                key={kind}
                label={kind}
                value={Object.entries(byStatus)
                  .map(([s, c]) => `${s}:${usd(c)}`)
                  .join('  ')}
              />
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="ag-theme-quartz" style={{ height: 460, width: '100%' }}>
          <AgGridReact<MoneyEvent>
            rowData={events}
            columnDefs={cols}
            getRowId={(p) => `${p.data.job_id}-${p.data.kind}-${p.data.request_id}`}
            defaultColDef={{ sortable: true, resizable: true }}
          />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 150 }}>
      <div className="muted mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>{label}</div>
      <div className="mono" style={{ fontSize: 15 }}>{value}</div>
    </div>
  );
}
