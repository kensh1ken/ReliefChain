import {
  Download,
  LogOut,
} from 'lucide-react';

type Props = {
  eventCount: number;
  onDownload: () => void;
  onLogout: () => void;
};

export default function AuditorHeader({
  eventCount,
  onDownload,
  onLogout,
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
          Trace every rupee from funding source to beneficiary settlement.
        </p>

      </div>

      <div className="auditor-header-actions">

        <div className="auditor-indexed">
          <i />
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

        <button
          type="button"
          className="auditor-topbar-signout"
          onClick={onLogout}
        >
          <LogOut size={14} />
          Sign out
        </button>

      </div>

    </header>
  );
}
