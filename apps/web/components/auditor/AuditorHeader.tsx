import {
  Download,
} from 'lucide-react';

type Props = {
  eventCount: number;
  onDownload: () => void;
};

export default function AuditorHeader({
  eventCount,
  onDownload,
}: Props) {
  return (
    <header className="auditor-header">

      <div>

        <span className="auditor-eyebrow">
          INDEPENDENT OVERSIGHT
        </span>

        <h1>
          Ledger reconciliation
        </h1>

        <p>
          Review source balances and immutable ledger events.
        </p>

      </div>

      <div className="auditor-header-actions">

        <div className="auditor-indexed">
          {eventCount.toLocaleString(
            'en-IN',
          )}{' '}
          indexed events
        </div>

        <button
          type="button"
          className="auditor-export"
          onClick={
            onDownload
          }
        >
          <Download size={14} />

          Export trail
        </button>

      </div>

    </header>
  );
}