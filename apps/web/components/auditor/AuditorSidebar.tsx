'use client';

import {
  ExternalLink,
  FileSearch,
} from 'lucide-react';

import Link from 'next/link';

export default function AuditorSidebar() {
  return (
    <aside className="auditor-sidebar">

      <Link
        href="/"
        className="auditor-brand"
      >
        <span className="auditor-brand-mark">
          R
        </span>

        <span className="auditor-brand-name">
          ReliefChain
        </span>
      </Link>

      <nav className="auditor-nav">

        <span className="auditor-nav-label">
          OVERSIGHT
        </span>

        <button
          type="button"
          className="auditor-nav-item active"
        >
          <FileSearch size={15} />

          Audit workspace
        </button>

        <Link
          href="/"
          className="auditor-nav-item"
        >
          <ExternalLink size={14} />

          Public dashboard
        </Link>

      </nav>

    </aside>
  );
}
