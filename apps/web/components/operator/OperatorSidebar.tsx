'use client';

import {
  ExternalLink,
} from 'lucide-react';

import Link from 'next/link';

export default function OperatorSidebar() {
  return (
    <aside className="operator-sidebar">

      <Link
        href="/"
        className="operator-brand"
      >
        <span className="operator-brand-mark">
          R
        </span>

        <span className="operator-brand-name">
          ReliefChain
        </span>
      </Link>

      <nav className="operator-nav">

        <span className="operator-nav-title">
          Operator
        </span>

        <div className="operator-nav-item active">
          Overview
        </div>

        <Link
          href="/"
          className="operator-nav-item"
        >
          Public dashboard

          <ExternalLink
            size={13}
          />
        </Link>

      </nav>

    </aside>
  );
}
