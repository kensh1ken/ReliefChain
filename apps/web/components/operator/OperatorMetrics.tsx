import type {
  OperatorContext,
} from '@/lib/operator-types';

type Props = {
  data?: OperatorContext;
};

export default function OperatorMetrics({
  data,
}: Props) {
  const metrics = [
    [
      'Fund sources',
      data?.sources.length ?? 0,
    ],
    [
      'Allocations',
      data?.allocations.length ?? 0,
    ],
    [
      'Beneficiaries',
      data?.beneficiaries.length ?? 0,
    ],
    [
      'Disbursements',
      data?.disbursements.length ?? 0,
    ],
  ];

  return (
    <div className="operator-metrics">

      {metrics.map(
        ([
          label,
          value,
        ]) => (
          <div
            key={label}
            className="operator-metric"
          >
            <span>
              {label}
            </span>

            <strong>
              {value}
            </strong>
          </div>
        ),
      )}

    </div>
  );
}