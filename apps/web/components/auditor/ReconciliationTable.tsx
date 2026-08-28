import {
  money,
} from '@/lib/api';

import type {
  ReconciliationRecord,
} from '@/lib/auditor-types';

type Props = {
  records: ReconciliationRecord[];
};

export default function ReconciliationTable({
  records,
}: Props) {
  return (
    <section className="auditor-panel">

      <div className="auditor-panel-heading">

        <div>
          <span className="auditor-panel-kicker">
            BALANCE CHECK
          </span>

          <h2>
            Source reconciliation
          </h2>

          <p>
            Every funding source should reconcile to its
            current public balance.
          </p>
        </div>

      </div>

      <div className="auditor-table-wrap">

        <table className="auditor-table">

          <thead>
            <tr>
              <th>
                Source
              </th>

              <th>
                Received
              </th>

              <th>
                Allocated
              </th>

              <th>
                Settled
              </th>

              <th>
                Pending
              </th>

              <th>
                Remaining
              </th>

              <th>
                Health
              </th>
            </tr>
          </thead>

          <tbody>

            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="auditor-table-empty"
                >
                  No reconciliation records available.
                </td>
              </tr>
            ) : (
              records.map(
                (record) => {
                  const allocationRate = record.amount_paise ? Math.min(100, (record.allocated_paise / record.amount_paise) * 100) : 0;
                  const healthy = record.allocated_paise <= record.amount_paise && record.disbursed_paise + record.pending_paise <= record.allocated_paise;
                  return (
                  <tr
                    key={
                      record.id
                    }
                  >

                    <td>
                      <strong>
                        {record.name}
                      </strong>

                      <small>
                        {record.source_type}
                      </small>

                      <div className="auditor-source-progress"><i style={{ width: `${allocationRate}%` }} /></div>
                    </td>

                    <td>
                      {money(
                        record.amount_paise,
                      )}
                    </td>

                    <td>
                      {money(
                        record.allocated_paise,
                      )}
                    </td>

                    <td>
                      {money(
                        record.disbursed_paise,
                      )}
                    </td>

                    <td>
                      {money(
                        record.pending_paise,
                      )}
                    </td>

                    <td>
                      <strong>
                        {money(
                          record.remaining_paise,
                        )}
                      </strong>
                    </td>

                    <td>
                      <span className={healthy ? 'auditor-health healthy' : 'auditor-health attention'}>
                        {healthy ? 'Reconciled' : 'Attention'}
                      </span>
                    </td>

                  </tr>
                  );
                },
              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}
