'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  api,
} from '@/lib/api';

import OperatorSidebar from '@/components/operator/OperatorSidebar';

import OperatorHeader from '@/components/operator/OperatorHeader';

import OperatorMetrics from '@/components/operator/OperatorMetrics';

import TransactionPanel from '@/components/operator/TransactionPanel';

import LatestDisbursements from '@/components/operator/LatestDisbursements';

import type {
  OperatorContext,
  OperatorUser,
} from '@/lib/operator-types';

export default function OperatorPage() {
  const router =
    useRouter();

  const [
    data,
    setData,
  ] =
    useState<
      OperatorContext |
      undefined
    >();

  const [
    user,
    setUser,
  ] =
    useState<
      OperatorUser |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  async function load() {
    try {
      setLoading(true);

      const result =
        await api<OperatorContext>(
          '/operator/context',
        );

      setData(
        result,
      );
    } catch {
      router.push(
        '/login',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          'reliefchain-user',
        );

      if (stored) {
        setUser(
          JSON.parse(
            stored,
          ) as OperatorUser,
        );
      }
    } catch {
      localStorage.removeItem(
        'reliefchain-user',
      );
    }

    void load();
  }, []);

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
    <main className="operator-page">

      <OperatorSidebar
        onLogout={
          logout
        }
      />

      <section className="operator-main">

        <OperatorHeader
          user={
            user
          }
        />

        {loading ? (
          <div className="operator-loading">
            Loading...
          </div>
        ) : (
          <>
            <OperatorMetrics
              data={
                data
              }
            />

            <div className="operator-grid">

              <TransactionPanel
                data={
                  data
                }
                onReload={
                  load
                }
              />

              <LatestDisbursements
                data={
                  data
                }
              />

            </div>
          </>
        )}

      </section>

    </main>
  );
}