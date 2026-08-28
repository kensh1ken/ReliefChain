'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  API,
  ApiError,
  api,
} from '@/lib/api';

import AuditorSidebar from '@/components/auditor/AuditorSidebar';

import AuditorHeader from '@/components/auditor/AuditorHeader';

import ReconciliationTable from '@/components/auditor/ReconciliationTable';

import EventStream from '@/components/auditor/EventStream';

import AuditorOverview from '@/components/auditor/AuditorOverview';

import type {
  AuditEvent,
  AuditExceptions,
  ReconciliationRecord,
} from '@/lib/auditor-types';

import { ASSAM_DISTRICTS } from '@/lib/assam-districts';

export default function AuditorPage() {
  const router =
    useRouter();

  const [
    events,
    setEvents,
  ] =
    useState<AuditEvent[]>(
      [],
    );

  const [
    reconciliation,
    setReconciliation,
  ] =
    useState<
      ReconciliationRecord[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [exceptions, setExceptions] = useState<AuditExceptions>({
    stalePendingPayouts: [],
    failedJobs: [],
    projectionLag: null,
    discrepancies: [],
    repeatedReversals: [],
  });

  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  async function load() {
    try {
      setLoading(true);
      setLoadWarning(null);

      const results = await Promise.allSettled([
          api<AuditEvent[]>(
            '/audit/events',
          ),

          api<ReconciliationRecord[]>(
            `/audit/reconciliation${selectedDistrict ? `?districtCode=${encodeURIComponent(selectedDistrict)}` : ''}`,
          ),

          api<AuditExceptions>(
            '/audit/exceptions',
          ),
        ]);

      const authFailure = results.find(
        (result) => result.status === 'rejected'
          && result.reason instanceof ApiError
          && (result.reason.status === 401 || result.reason.status === 403),
      );

      if (authFailure) {
        router.push('/login');
        return;
      }

      if (results[0].status === 'fulfilled') setEvents(results[0].value);
      if (results[1].status === 'fulfilled') setReconciliation(results[1].value);
      if (results[2].status === 'fulfilled') setExceptions(results[2].value);

      const failedSections = ['ledger events', 'reconciliation', 'exception monitoring']
        .filter((_, index) => results[index].status === 'rejected');

      if (failedSections.length > 0) {
        setLoadWarning(
          `Some audit data is temporarily unavailable: ${failedSections.join(', ')}.`,
        );
      }
    } catch (
      error
    ) {
      console.error(
        'Auditor data failed to load:',
        error,
      );

      setLoadWarning('The audit workspace could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [selectedDistrict]);

  async function download() {
    try {
      const response =
        await fetch(
          `${API}/audit/export.csv`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem(
                  'reliefchain-token',
                )}`,
            },
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `Export failed: ${response.status}`,
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          'a',
        );

      anchor.href =
        url;

      anchor.download =
        'reliefchain-audit.csv';

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch (
      error
    ) {
      console.error(
        'Audit export failed:',
        error,
      );
    }
  }

  function logout() {
    localStorage.removeItem(
      'reliefchain-token',
    );

    localStorage.removeItem(
      'reliefchain-user',
    );

    router.push(
      '/login',
    );
  }

  return (
    <main className="auditor-page">

      <AuditorSidebar />

      <section className="auditor-main">

        <AuditorHeader
          eventCount={
            events.length
          }
          onDownload={
            download
          }
          onLogout={
            logout
          }
        />

        <div className="auditor-scopebar">
          <div className="auditor-district-select">
            <label htmlFor="auditor-district">Reconciliation district</label>
            <select
              id="auditor-district"
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
            >
              <option value="">All Assam districts</option>
              {ASSAM_DISTRICTS.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <p>
            {selectedDistrict
              ? 'Reconciliation totals are filtered to the selected district.'
              : 'Showing statewide reconciliation across Assam.'}
          </p>
        </div>

        {loading ? (
          <div className="auditor-loading">
            Loading audit workspace...
          </div>
        ) : (
          <div className="auditor-content">

            {loadWarning && (
              <div className="auditor-data-warning" role="alert">
                <div>
                  <strong>Partial data availability</strong>
                  <span>{loadWarning}</span>
                </div>
                <button type="button" onClick={() => void load()}>
                  Retry
                </button>
              </div>
            )}

            <AuditorOverview
              events={events}
              records={reconciliation}
              exceptions={exceptions}
            />

            <ReconciliationTable
              records={
                reconciliation
              }
            />

            <EventStream
              events={
                events
              }
            />

          </div>
        )}

      </section>

    </main>
  );
}
