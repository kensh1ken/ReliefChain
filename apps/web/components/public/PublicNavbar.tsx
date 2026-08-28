'use client';

import { Landmark } from 'lucide-react';
import Link from 'next/link';

export default function PublicNavbar() {
  return (
    <header className="public-nav">
      <nav className="public-nav-links">
        <a href="#overview">
          Overview
        </a>

        <a href="#districts">
          Districts
        </a>

        <a href="#flow">
          How it works
        </a>

        <a href="#verify">
          Verify
        </a>
      </nav>

      <Link
        href="/login"
        className="button button-primary"
      >
        <Landmark size={16} />
        Institution login
      </Link>
    </header>
  );
}