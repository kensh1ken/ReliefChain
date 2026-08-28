'use client';

import {
  ExternalLink,
  LogOut,
} from 'lucide-react';

import Link from 'next/link';

type Props = {
  onLogout: () => void;
};

export default function OperatorSidebar({
  onLogout,
}: Props) {
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

      <button
        type="button"
        className="operator-signout"
        onClick={onLogout}
      >
        <LogOut size={14} />

        Sign out
      </button>

    </aside>
  );
}