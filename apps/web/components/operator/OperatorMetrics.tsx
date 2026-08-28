import type {
  OperatorContext,
} from '@/lib/operator-types';

import { money } from '@/lib/api';

type Props = {
  data?: OperatorContext;
};

export default function OperatorMetrics({
  data,
}: Props) {
  const sources = data?.sources ?? [];
  const allocations = data?.allocations ?? [];
  const total = sources.reduce((sum, item) => sum + item.amount_paise, 0);
  const available = sources.reduce((sum, item) => sum + item.amount_paise - item.allocated_paise, 0);
  const settled = data?.disbursements.filter((item) => item.status === 'SETTLED') ?? [];
  const metrics = [
    ['Total relief pool', money(total), `${sources.length} funding source${sources.length === 1 ? '' : 's'}`, '₹'],
    ['Unallocated balance', money(available), 'Available for new allocations', '↗'],
    ['Settled assistance', money(settled.reduce((sum, item) => sum + item.amount_paise, 0)), `${settled.length} successful payouts`, '✓'],
    ['Eligible beneficiaries', String(data?.beneficiaries.length ?? 0), `${allocations.length} active allocation${allocations.length === 1 ? '' : 's'}`, '◎'],
  ];

  return (
    <div className="operator-metrics">

      {metrics.map(
        ([
          label,
          value,
          note,
          icon,
        ]) => (
          <div
            key={label}
            className="operator-metric"
          >
            <div className="operator-metric-top"><span>{label}</span><i>{icon}</i></div>
            <strong>{value}</strong>
          </div>
        ),
      )}

    </div>
  );
}
