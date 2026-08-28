import {
  CheckCircle2,
} from 'lucide-react';

import type {
  AuditEvent,
} from '@/lib/auditor-types';

type Props = {
  events: AuditEvent[];
};

export default function EventStream({
  events,
}: Props) {
  return (
    <section className="auditor-panel">

      <div className="auditor-panel-heading">

        <div>
          <span className="auditor-panel-kicker">
            LEDGER ACTIVITY
          </span>

          <h2>
            Immutable event stream
          </h2>

          <p>
            Fabric-confirmed events, newest first.
          </p>
        </div>

        <div className="auditor-event-count">
          {events.length}
        </div>

      </div>

      <div className="auditor-table-wrap">

        <table className="auditor-table auditor-event-table">

          <thead>
            <tr>
              <th>
                Event
              </th>

              <th>
                Entity
              </th>

              <th>
                Transaction
              </th>

              <th>
                Committed
              </th>
            </tr>
          </thead>

          <tbody>

            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="auditor-table-empty"
                >
                  No ledger events available.
                </td>
              </tr>
            ) : (
              events.map(
                (event) => (
                  <tr
                    key={
                      event.sequence
                    }
                  >

                    <td>
                      <div className="auditor-event-name">

                        <CheckCircle2
                          size={14}
                        />

                        <strong>
                          {event.event_name}
                        </strong>

                      </div>
                    </td>

                    <td>

                      <strong>
                        {event.entity_type}
                      </strong>

                      <small>
                        {String(
                          event.entity_id,
                        ).slice(
                          0,
                          18,
                        )}
                        …
                      </small>

                    </td>

                    <td>
                      <span className="auditor-transaction-id">
                        {event.transaction_id.slice(
                          0,
                          20,
                        )}
                        …
                      </span>
                    </td>

                    <td>
                      {new Date(
                        event.committed_at,
                      ).toLocaleString(
                        'en-IN',
                      )}
                    </td>

                  </tr>
                ),
              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}