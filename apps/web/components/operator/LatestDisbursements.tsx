import type {
  OperatorContext,
} from '@/lib/operator-types';

import {
  money,
} from '@/lib/api';

import { districtNameFromCode } from '@/lib/assam-districts';

type Props = {
  data?: OperatorContext;
};

export default function LatestDisbursements({
  data,
}: Props) {
  const items =
    data?.disbursements
      ?.slice(0, 8) ??
    [];

  return (
    <section className="operator-panel">

      <div className="operator-panel-header">
        <div>

          <span>
            ACTIVITY
          </span>

          <h2>
            Latest disbursements
          </h2>

          <p>Recent beneficiary payments with their funding route.</p>

        </div>
      </div>

      {items.length === 0 ? (
        <div className="operator-empty">
          No disbursements yet.
        </div>
      ) : (
        <>
          <div className="operator-activity-summary">
            {['SETTLED', 'PENDING', 'FAILED'].map((status) => (
              <div key={status}>
                <span className={`operator-status-dot dot-${status.toLowerCase()}`} />
                <strong>{items.filter((item) => item.status === status).length}</strong>
                <small>{status.toLowerCase()}</small>
              </div>
            ))}
          </div>

          <div className="operator-disbursements">

          {items.map(
            (
              item,
            ) => {
              const allocation = data?.allocations.find((candidate) => candidate.id === item.allocation_id);
              const scheme = data?.schemes.find((candidate) => candidate.id === allocation?.scheme_id);
              return (
              <div
                key={
                  item.id
                }
                className="operator-disbursement"
              >

                <div>
                  <strong>
                    {
                      item.public_reference
                    }
                  </strong>

                  <span>
                    {allocation ? districtNameFromCode(allocation.district_code) : 'District'} · {scheme?.name ?? 'Relief scheme'}
                  </span>
                </div>

                <strong className="operator-disbursement-amount">
                  {money(
                    item.amount_paise,
                  )}
                </strong>

                <span
                  className={`operator-status operator-status-${item.status.toLowerCase()}`}
                >
                  {item.status}
                </span>

              </div>
              );
            },
          )}

          </div>
        </>
      )}

    </section>
  );
}
