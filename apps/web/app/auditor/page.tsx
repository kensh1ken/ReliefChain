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
  api,
} from '@/lib/api';

import AuditorSidebar from '@/components/auditor/AuditorSidebar';

import AuditorHeader from '@/components/auditor/AuditorHeader';

import ReconciliationTable from '@/components/auditor/ReconciliationTable';

import EventStream from '@/components/auditor/EventStream';

import type {
  AuditEvent,
  ReconciliationRecord,
} from '@/lib/auditor-types';

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

  async function load() {
    try {
      setLoading(true);

      const [
        eventData,
        reconciliationData,
      ] =
        await Promise.all([
          api<AuditEvent[]>(
            '/audit/events',
          ),

          api<ReconciliationRecord[]>(
            '/audit/reconciliation',
          ),
        ]);

      setEvents(
        eventData,
      );

      setReconciliation(
        reconciliationData,
      );
    } catch (
      error
    ) {
      console.error(
        'Auditor data failed to load:',
        error,
      );

      router.push(
        '/login',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

      <AuditorSidebar
        onLogout={
          logout
        }
      />

      <section className="auditor-main">

        <AuditorHeader
          eventCount={
            events.length
          }
          onDownload={
            download
          }
        />

        {loading ? (
          <div className="auditor-loading">
            Loading audit workspace...
          </div>
        ) : (
          <div className="auditor-content">

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