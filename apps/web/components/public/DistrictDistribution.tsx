'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { money } from '@/lib/api';
import { districtNameFromCode } from '@/lib/assam-districts';

export type District = {
  district_code: string;
  scheme_name: string;
  source_type: string;
  beneficiary_count: number;
  disbursed_paise: number;
  pending_paise: number;
  allocated_paise?: number;
  failed_paise?: number;
  average_payout_paise?: number;
  allocation_count?: number;
  payout_count?: number;
  settled_count?: number;
  pending_count?: number;
  failed_count?: number;
  scheme_count?: number;
  source_count?: number;
};

type DistrictDistributionProps = {
  districts: District[];
  selectedDistrict: string | null;
  onSelect: (districtCode: string | null) => void;
};

type SortMode = 'delivered' | 'families' | 'utilization';

function sourceLabel(value: string): string {
  return value
    .split(', ')
    .map((item) => item.replaceAll('_', ' ').toLowerCase())
    .map((item) => item.replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(' · ');
}

function allocatedAmount(district: District): number | null {
  return district.allocated_paise ?? null;
}

function utilization(district: District): number | null {
  const allocated = allocatedAmount(district);
  return allocated !== null && allocated > 0
    ? Math.min(100, (district.disbursed_paise / allocated) * 100)
    : null;
}

export default function DistrictDistribution({
  districts,
  selectedDistrict,
  onSelect,
}: DistrictDistributionProps) {
  const [sortMode, setSortMode] = useState<SortMode>('delivered');

  const fundedDistricts = useMemo(
    () => districts.filter(
      (district) => district.disbursed_paise > 0 || district.pending_paise > 0,
    ),
    [districts],
  );

  const visibleDistricts = useMemo(() => {
    const filtered = fundedDistricts.filter(
      (district) => !selectedDistrict || district.district_code === selectedDistrict,
    );

    return [...filtered].sort((left, right) => {
      if (sortMode === 'families') return right.beneficiary_count - left.beneficiary_count;
      if (sortMode === 'utilization') return (utilization(right) ?? -1) - (utilization(left) ?? -1);
      return right.disbursed_paise - left.disbursed_paise;
    });
  }, [fundedDistricts, selectedDistrict, sortMode]);

  const totals = visibleDistricts.reduce(
    (summary, district) => ({
      allocated: summary.allocated + (district.allocated_paise ?? 0),
      delivered: summary.delivered + district.disbursed_paise,
      pending: summary.pending + district.pending_paise,
      families: summary.families + district.beneficiary_count,
      payouts: summary.payouts + (district.payout_count ?? 0),
      settled: summary.settled + (district.settled_count ?? 0),
    }),
    { allocated: 0, delivered: 0, pending: 0, families: 0, payouts: 0, settled: 0 },
  );
  const hasAllocationData = visibleDistricts.every((district) => district.allocated_paise !== undefined);
  const hasOutcomeData = visibleDistricts.every(
    (district) => district.payout_count !== undefined && district.settled_count !== undefined,
  );
  const successRate = hasOutcomeData && totals.payouts > 0
    ? (totals.settled / totals.payouts) * 100
    : null;

  return (
    <div className="district-distribution">
      <div className="district-toolbar">
        <div className="district-selector">
          <label htmlFor="district-filter">District</label>
          <div className="district-select-wrap">
            <select
              id="district-filter"
              value={selectedDistrict ?? ''}
              onChange={(event) => onSelect(event.target.value || null)}
            >
              <option value="">All funded districts</option>
              {fundedDistricts.map((district) => (
                <option key={district.district_code} value={district.district_code}>
                  {districtNameFromCode(district.district_code)}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="district-select-icon" />
          </div>
        </div>

        <div className="district-selector district-sort-selector">
          <label htmlFor="district-sort">Order by</label>
          <div className="district-select-wrap">
            <select
              id="district-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="delivered">Amount delivered</option>
              <option value="families">Families reached</option>
              <option value="utilization">Fund utilization</option>
            </select>
            <ChevronDown size={15} className="district-select-icon" />
          </div>
        </div>
      </div>

      {visibleDistricts.length > 0 && (
        <div className="district-summary" aria-label="District relief summary">
          <div><span>Allocated</span><strong>{hasAllocationData ? money(totals.allocated) : '—'}</strong></div>
          <div><span>Delivered</span><strong>{money(totals.delivered)}</strong></div>
          <div><span>Pending</span><strong>{money(totals.pending)}</strong></div>
          <div><span>Families reached</span><strong>{totals.families.toLocaleString('en-IN')}</strong></div>
          <div><span>Payout success</span><strong>{successRate === null ? '—' : `${successRate.toFixed(0)}%`}</strong></div>
        </div>
      )}

      <div className="district-table">
        <div className="district-table-header">
          <span>District and coverage</span>
          <span>Allocation</span>
          <span>Reach</span>
          <span>Delivery status</span>
        </div>

        {visibleDistricts.length === 0 ? (
          <div className="district-empty">
            <strong>No recorded district relief</strong>
            <span>Funded districts will appear here once public records are indexed.</span>
          </div>
        ) : visibleDistricts.map((district) => {
          const selected = selectedDistrict === district.district_code;
          const allocated = allocatedAmount(district);
          const utilized = utilization(district);
          const payoutCount = district.payout_count;
          const settledCount = district.settled_count;
          const failedCount = district.failed_count ?? 0;

          return (
            <button
              key={district.district_code}
              type="button"
              className={selected ? 'district-row district-row-selected' : 'district-row'}
              onClick={() => onSelect(selected ? null : district.district_code)}
            >
              <div className="district-name">
                <div className="district-title-line">
                  <strong>{districtNameFromCode(district.district_code)}</strong>
                  <span>{district.district_code}</span>
                </div>
                <span>{district.scheme_name}</span>
                <small>{sourceLabel(district.source_type)}</small>
              </div>

              <div className="district-allocation">
                <strong>{allocated === null ? 'Detailed index pending' : money(allocated)}</strong>
                {utilized !== null && (
                  <div className="district-utilization-line">
                    <span><i style={{ width: `${utilized}%` }} /></span>
                    <small>{utilized.toFixed(0)}% delivered</small>
                  </div>
                )}
                {district.allocation_count !== undefined && (
                  <small>{district.allocation_count} allocation{district.allocation_count === 1 ? '' : 's'}</small>
                )}
              </div>

              <div className="district-reach">
                <strong>{district.beneficiary_count.toLocaleString('en-IN')}</strong>
                <span>families</span>
                {payoutCount !== undefined && (
                  <small>{payoutCount.toLocaleString('en-IN')} payout{payoutCount === 1 ? '' : 's'}</small>
                )}
              </div>

              <div className="district-delivery">
                <strong>{money(district.disbursed_paise)}</strong>
                <span>{settledCount === undefined ? 'Settled assistance' : `${settledCount.toLocaleString('en-IN')} settled`}</span>
                <div className="district-statuses">
                  {district.pending_paise > 0 && (
                    <small className="district-status-pending">
                      {money(district.pending_paise)} pending
                    </small>
                  )}
                  {failedCount > 0 && (
                    <small className="district-status-failed">
                      {failedCount} failed
                    </small>
                  )}
                  {district.average_payout_paise !== undefined && (
                    <small>{money(district.average_payout_paise)} avg.</small>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
