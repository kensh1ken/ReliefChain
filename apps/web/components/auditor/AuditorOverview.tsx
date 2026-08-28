import { money } from '@/lib/api';
import type { AuditEvent, AuditExceptions, ReconciliationRecord } from '@/lib/auditor-types';
import type { CSSProperties } from 'react';

type Props = {
  events: AuditEvent[];
  records: ReconciliationRecord[];
  exceptions: AuditExceptions;
};

export default function AuditorOverview({ events, records, exceptions }: Props) {
  const received = records.reduce((sum, item) => sum + item.amount_paise, 0);
  const allocated = records.reduce((sum, item) => sum + item.allocated_paise, 0);
  const settled = records.reduce((sum, item) => sum + item.disbursed_paise, 0);
  const pending = records.reduce((sum, item) => sum + item.pending_paise, 0);
  const exceptionCount = exceptions.stalePendingPayouts.length + exceptions.failedJobs.length + exceptions.repeatedReversals.length;
  const uniqueTransactions = new Set(events.map((event) => event.transaction_id)).size;
  const eventGroups = Object.entries(events.reduce<Record<string, number>>((groups, event) => {
    const label = event.event_name.includes('Disbursement') ? 'Payouts' : event.event_name.includes('Fund') || event.event_name.includes('Allocat') ? 'Funding' : event.event_name.includes('Beneficiary') ? 'Beneficiaries' : 'Setup';
    groups[label] = (groups[label] ?? 0) + 1;
    return groups;
  }, {}));
  const maxEvents = Math.max(1, ...eventGroups.map(([, count]) => count));
  const deployedRate = allocated ? Math.min(100, ((settled + pending) / allocated) * 100) : 0;
  const latest = events[0]?.committed_at ? new Date(events[0].committed_at) : null;

  return (
    <section className="auditor-overview" aria-label="Audit health overview">
      <div className="auditor-kpis">
        {[
          ['Funds received', money(received), 'Across all registered sources'],
          ['Allocated', money(allocated), `${received ? ((allocated / received) * 100).toFixed(1) : 0}% of received funds`],
          ['Settled payouts', money(settled), pending ? `${money(pending)} currently reserved` : 'No money awaiting settlement'],
          ['Audit exceptions', String(exceptionCount), exceptionCount ? 'Requires auditor attention' : 'No operational exceptions'],
        ].map(([label, value, note], index) => (
          <div className={`auditor-kpi tone-${index + 1}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <div className="auditor-visual-grid">
        <div className="auditor-visual-card">
          <div className="dashboard-section-heading compact">
            <div><span>CAPITAL DEPLOYMENT</span><h2>Allocated to beneficiary payments</h2></div>
          </div>
          <div className="auditor-deployment-chart">
            <div className="dashboard-donut auditor-donut" style={{ '--chart-value': `${deployedRate}%` } as CSSProperties}>
              <span>{deployedRate.toFixed(1)}%</span><small>deployed</small>
            </div>
            <div className="dashboard-chart-legend">
              <div><i className="legend-cyan" /><span>Allocated</span><strong>{money(allocated)}</strong></div>
              <div><i className="legend-green" /><span>Settled</span><strong>{money(settled)}</strong></div>
              <div><i className="legend-amber" /><span>Pending</span><strong>{money(pending)}</strong></div>
            </div>
          </div>
        </div>

        <div className="auditor-visual-card">
          <div className="dashboard-section-heading compact">
            <div><span>EVENT COMPOSITION</span><h2>What changed on the ledger</h2></div>
          </div>
          <div className="dashboard-bars auditor-event-bars">
            {eventGroups.map(([label, count]) => (
              <div className="dashboard-bar-row" key={label}>
                <span>{label}</span><div><i style={{ width: `${(count / maxEvents) * 100}%` }} /></div><strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="auditor-integrity-card">
          <div className="auditor-integrity-icon">✓</div>
          <div>
            <span>LEDGER INTEGRITY</span>
            <h2>{exceptions.projectionLag === 0 ? 'Projection fully synchronized' : 'Ledger connection active'}</h2>
            <p>{uniqueTransactions} unique Fabric transactions represented by {events.length} indexed events.</p>
          </div>
          <div className="auditor-integrity-facts">
            <div><span>Projection lag</span><strong>{exceptions.projectionLag ?? '—'}</strong></div>
            <div><span>Latest commit</span><strong>{latest ? latest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
            <div><span>Failed jobs</span><strong>{exceptions.failedJobs.length}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
