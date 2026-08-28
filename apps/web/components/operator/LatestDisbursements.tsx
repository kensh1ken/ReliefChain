import type {
  OperatorContext,
} from '@/lib/operator-types';

import {
  money,
} from '@/lib/api';

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

        </div>
      </div>

      {items.length === 0 ? (
        <div className="operator-empty">
          No disbursements yet.
        </div>
      ) : (
        <div className="operator-disbursements">

          {items.map(
            (
              item,
            ) => (
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
                    Public reference
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
            ),
          )}

        </div>
      )}

    </section>
  );
}