'use client';

import {
  ArrowRight,
  Landmark,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  money,
} from '@/lib/api';

import type {
  Summary,
} from '@/app/page';

type Props = {
  summary:
    | Summary
    | null;
};

export default function MoneyFlow({
  summary,
}: Props) {
  return (
    <section
      className="page-section flow-section"
      id="flow"
    >
      <div className="section-heading">
        <div>
          <span className="section-kicker">
            03 · Follow the money
          </span>

          <h2>
            From fund to family
          </h2>

          <p>
            Each major handoff is
            represented by recorded
            public data.
          </p>
        </div>
      </div>

      <div className="money-flow-card">
        <div className="flow-step">
          <div className="flow-icon">
            <Landmark size={21} />
          </div>

          <span>
            Funds received
          </span>

          <strong>
            {money(
              summary?.received_paise,
            )}
          </strong>

          <small>
            Government / NGO
          </small>
        </div>

        <div className="flow-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="flow-step">
          <div className="flow-icon">
            <MapPin size={21} />
          </div>

          <span>
            Allocated
          </span>

          <strong>
            {money(
              summary?.allocated_paise,
            )}
          </strong>

          <small>
            District + scheme
          </small>
        </div>

        <div className="flow-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="flow-step">
          <div className="flow-icon">
            <Users size={21} />
          </div>

          <span>
            Disbursed
          </span>

          <strong>
            {money(
              summary?.disbursed_paise,
            )}
          </strong>

          <small>
            Families reached
          </small>
        </div>

        <div className="flow-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="flow-step">
          <div className="flow-icon">
            <ShieldCheck size={21} />
          </div>

          <span>
            On ledger
          </span>

          <strong>
            {summary
              ? 'Recorded'
              : '—'}
          </strong>

          <small>
            {summary?.source ===
            'FABRIC_INDEX'
              ? 'Hyperledger Fabric'
              : 'Ledger index'}
          </small>
        </div>
      </div>
    </section>
  );
}