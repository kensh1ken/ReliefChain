import { money } from '@/lib/api';
import type { OperatorContext } from '@/lib/operator-types';
import type { CSSProperties } from 'react';
import { districtNameFromCode } from '@/lib/assam-districts';

type Props = { data?: OperatorContext };

const statusOrder = ['SETTLED', 'PENDING', 'FAILED', 'UNKNOWN', 'REVERSED'];

export default function OperatorInsights({ data }: Props) {
  const sources = data?.sources ?? [];
  const allocations = data?.allocations ?? [];
  const beneficiaries = data?.beneficiaries ?? [];
  const disbursements = data?.disbursements ?? [];
  const totalFunds = sources.reduce((sum, item) => sum + item.amount_paise, 0);
  const allocated = sources.reduce((sum, item) => sum + item.allocated_paise, 0);
  const disbursed = allocations.reduce((sum, item) => sum + item.disbursed_paise, 0);
  const reserved = allocations.reduce((sum, item) => sum + item.reserved_paise, 0);
  const allocationRate = totalFunds ? Math.min(100, (allocated / totalFunds) * 100) : 0;
  const statusCounts = statusOrder.map((status) => ({
    status,
    count: disbursements.filter((item) => item.status === status).length,
  })).filter((item) => item.count > 0);
  const maxStatus = Math.max(1, ...statusCounts.map((item) => item.count));

  return (
    <section className="operator-insights" aria-label="Connected relief funding overview">
      <div className="operator-flow-card">
        <div className="dashboard-section-heading">
          <div>
            <span>CONNECTED WORKFLOW</span>
            <h2>How this relief operation is linked</h2>
          </div>
          <p>Every payout traces back through an eligible beneficiary and allocation to its original fund.</p>
        </div>

        <div className="operator-flow-track">
          {[
            ['01', 'Fund pool', `${sources.length} sources`, 'Money received for a declared disaster'],
            ['02', 'Allocation', `${allocations.length} allocations`, 'Earmarked by scheme and district'],
            ['03', 'Beneficiary', `${beneficiaries.length} eligible`, 'Registered against the same scheme and district'],
            ['04', 'Payout', `${disbursements.length} records`, 'Reserved, processed, and permanently tracked'],
          ].map(([step, label, value, description], index) => (
            <div className="operator-flow-stage" key={label}>
              <div className="operator-flow-step">{step}</div>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{description}</small>
              </div>
              {index < 3 && <div className="operator-flow-arrow" aria-hidden="true">→</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="operator-chart-card">
        <div className="dashboard-section-heading compact">
          <div>
            <span>FUND UTILIZATION</span>
            <h2>Pool to allocation</h2>
          </div>
        </div>
        <div className="operator-donut-layout">
          <div className="dashboard-donut" style={{ '--chart-value': `${allocationRate}%` } as CSSProperties}>
            <span>{allocationRate.toFixed(0)}%</span>
            <small>allocated</small>
          </div>
          <div className="dashboard-chart-legend">
            <div><i className="legend-blue" /><span>Total pool</span><strong>{money(totalFunds)}</strong></div>
            <div><i className="legend-cyan" /><span>Allocated</span><strong>{money(allocated)}</strong></div>
            <div><i className="legend-green" /><span>Settled</span><strong>{money(disbursed)}</strong></div>
            <div><i className="legend-amber" /><span>Reserved</span><strong>{money(reserved)}</strong></div>
          </div>
        </div>
      </div>

      <div className="operator-chart-card">
        <div className="dashboard-section-heading compact">
          <div>
            <span>PAYOUT OUTCOMES</span>
            <h2>Disbursement health</h2>
          </div>
        </div>
        <div className="dashboard-bars">
          {statusCounts.length ? statusCounts.map(({ status, count }) => (
            <div className="dashboard-bar-row" key={status}>
              <span>{status}</span>
              <div><i className={`bar-${status.toLowerCase()}`} style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>
          )) : <p className="dashboard-empty-copy">No payouts have been created yet.</p>}
        </div>
        <div className="operator-chart-note">
          <strong>{money(disbursed)}</strong>
          <span>successfully delivered across {disbursements.filter((item) => item.status === 'SETTLED').length} settled payouts</span>
        </div>
      </div>

      <div className="operator-allocation-card">
        <div className="dashboard-section-heading compact">
          <div>
            <span>ACTIVE ALLOCATIONS</span>
            <h2>Scheme and district links</h2>
          </div>
        </div>
        <div className="operator-allocation-list">
          {allocations.slice(0, 4).map((allocation) => {
            const source = sources.find((item) => item.id === allocation.source_id);
            const scheme = data?.schemes.find((item) => item.id === allocation.scheme_id);
            const eligible = beneficiaries.filter((item) => item.scheme_id === allocation.scheme_id && item.district_code === allocation.district_code).length;
            const used = allocation.amount_paise ? Math.min(100, ((allocation.disbursed_paise + allocation.reserved_paise) / allocation.amount_paise) * 100) : 0;
            return (
              <div className="operator-allocation-item" key={allocation.id}>
                <div className="operator-allocation-title">
                  <span>{districtNameFromCode(allocation.district_code)}</span>
                  <strong>{scheme?.name ?? 'Relief scheme'}</strong>
                  <small>{source?.name ?? 'Fund source'} · {eligible} eligible beneficiaries</small>
                </div>
                <div className="operator-allocation-money">
                  <strong>{money(allocation.amount_paise - allocation.disbursed_paise - allocation.reserved_paise)}</strong>
                  <span>available</span>
                </div>
                <div className="operator-allocation-progress"><i style={{ width: `${used}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
