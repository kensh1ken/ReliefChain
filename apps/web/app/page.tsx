'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowRight,
  CheckCircle2,
  Landmark,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

import Link from 'next/link';

import {
  api,
  money,
} from '@/lib/api';

import AssamReliefMap from '@/components/public/AssamReliefMap';

import DistrictDistribution from '@/components/public/DistrictDistribution';

/* ==========================================================================
   TYPES
   ========================================================================== */

export type Summary = {
  received_paise: number;
  allocated_paise: number;
  pending_paise: number;
  disbursed_paise: number;
  failed_paise: number;
  remaining_paise: number;
  last_indexed_at: string;
  source: string;
};

export type District = {
  district_code: string;
  scheme_name: string;
  source_type: string;
  beneficiary_count: number;
  disbursed_paise: number;
  pending_paise: number;
};

type Proof = {
  found?: boolean;
  status: string;
  amount_paise: number;
  district_code: string;
  scheme_name: string;

  proof: {
    transactionId: string;
    committedAt: string;
  };
};

/* ==========================================================================
   HOME
   ========================================================================== */

export default function Home() {
  const [
    summary,
    setSummary,
  ] =
    useState<Summary | null>(
      null,
    );

  const [
    districts,
    setDistricts,
  ] =
    useState<District[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* ================================================================
     NEW:
     Selected district shared by the map + dropdown + table.
     ================================================================ */

  const [
    selectedDistrict,
    setSelectedDistrict,
  ] =
    useState<string | null>(
      null,
    );

  const [
    reference,
    setReference,
  ] =
    useState('');

  const [
    proof,
    setProof,
  ] =
    useState<Proof | null>(
      null,
    );

  const [
    verifyError,
    setVerifyError,
  ] =
    useState('');

  const [
    verifying,
    setVerifying,
  ] =
    useState(false);

  /* ==========================================================================
     LOAD PUBLIC DATA
     ========================================================================== */

  useEffect(() => {
    let cancelled =
      false;

    async function loadDashboard() {
      try {
        const [
          summaryData,
          districtData,
        ] =
          await Promise.all([
            api<Summary>(
              '/public/summary',
            ),

            api<District[]>(
              '/public/districts',
            ),
          ]);

        if (
          cancelled
        ) {
          return;
        }

        setSummary(
          summaryData,
        );

        setDistricts(
          districtData,
        );
      } catch (
        error
      ) {
        console.error(
          'Public dashboard failed to load:',
          error,
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================================
     FUNDED DISTRICTS
     ========================================================================== */

  const fundedDistricts =
    useMemo(() => {
      return districts.filter(
        (district) =>
          district.disbursed_paise >
            0 ||
          district.pending_paise >
            0,
      );
    }, [districts]);

  /* ==========================================================================
     TOTAL FAMILIES
     ========================================================================== */

  const totalFamilies =
    useMemo(() => {
      return districts.reduce(
        (
          total,
          district,
        ) =>
          total +
          district.beneficiary_count,
        0,
      );
    }, [districts]);

  /* ==========================================================================
     DISTRICT SELECT
     ========================================================================== */

  function handleDistrictSelect(
    code: string | null,
  ) {
    setSelectedDistrict(
      code,
    );

    if (!code) {
      return;
    }

    /*
     * Scroll only after the state update has been
     * queued so the selected row can render.
     */
    requestAnimationFrame(() => {
      document
        .getElementById(
          'districts',
        )
        ?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'start',
        });
    });
  }

  /* ==========================================================================
     PAYMENT VERIFICATION
     ========================================================================== */

  const verifyPayment =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setVerifyError('');
      setProof(null);

      const trimmed =
        reference.trim();

      if (!trimmed) {
        setVerifyError(
          'Enter a public payment reference.',
        );

        return;
      }

      setVerifying(
        true,
      );

      try {
        const result =
          await api<Proof>(
            `/public/proof/${encodeURIComponent(
              trimmed,
            )}`,
          );

        if (
          result.found ===
          false
        ) {
          throw new Error(
            'No public proof was found for this reference.',
          );
        }

        setProof(
          result,
        );
      } catch (
        error
      ) {
        setVerifyError(
          error instanceof Error
            ? error.message
            : 'Unable to verify this payment.',
        );
      } finally {
        setVerifying(
          false,
        );
      }
    };

  return (
    <main className="public-shell">

      {/* ================================================================== */}
      {/* NAVBAR                                                             */}
      {/* ================================================================== */}

      <header className="public-nav">

        <div className="nav-brand">

          <div className="nav-brand-mark">
            R
          </div>

          <div className="nav-brand-copy">

            <strong>
              ReliefChain
            </strong>

            <span>
              Transparent relief. Trusted impact.
            </span>

          </div>

        </div>

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
          className="nav-login"
        >
          <Landmark
            size={16}
          />

          Institution login
        </Link>

      </header>

      {/* ================================================================== */}
      {/* HERO / MAP                                                         */}
      {/* ================================================================== */}

      <section
        id="overview"
        className="map-hero"
      >

        <div className="hero-background">

          <img
            src="/images/hero-landscape.png"
            alt=""
            aria-hidden="true"
          />

        </div>

        <div className="hero-overlay" />

        <div className="hero-title">

          <span>
            ASSAM · PUBLIC RELIEF LEDGER
          </span>

          <h1>
            Relief
            <br />
            across
            <br />
            <em>Assam.</em>
          </h1>

          <p>
            Explore districts with recorded relief and
            follow public funds from source to family.
          </p>

          <div className="hero-note">

            <ShieldCheck
              size={15}
            />

            <span>
              Personal identity stays private.
            </span>

          </div>

        </div>

        <div className="hero-data">

          <div className="hero-data-label">
            PUBLIC RECORD
          </div>

          <div className="hero-data-main">

            <strong>
              {
                fundedDistricts.length
              }
            </strong>

            <span>
              funded districts
            </span>

          </div>

          <div className="hero-data-divider" />

          <div className="hero-data-row">

            <span>
              Relief sent
            </span>

            <strong>
              {summary
                ? money(
                    summary.disbursed_paise,
                  )
                : '—'}
            </strong>

          </div>

          <div className="hero-data-row">

            <span>
              Families
            </span>

            <strong>
              {
                totalFamilies.toLocaleString(
                  'en-IN',
                )
              }
            </strong>

          </div>

          <div className="hero-data-row">

            <span>
              Ledger
            </span>

            <strong className="live-text">
              {loading
                ? 'SYNCING'
                : 'LIVE'}
            </strong>

          </div>

        </div>

        {/* ================================================================ */}
        {/* MAP                                                              */}
        {/* ================================================================ */}

        <div className="hero-map">

          <AssamReliefMap
            districts={
              districts
            }

            loading={
              loading
            }

            /*
             * THIS connects the map to the page.
             */
            onDistrictSelect={
              handleDistrictSelect
            }
          />

        </div>

        {/* No map legend / extra bottom controls here */}

      </section>

      {/* ================================================================== */}
      {/* TOTAL RELIEF                                                       */}
      {/* ================================================================== */}

      <section
        className="section summary-section"
      >

        <div className="section-heading">

          <div>

            <span className="section-kicker">
              01 · THE NUMBERS
            </span>

            <h2>
              Total relief
            </h2>

            <p>
              Confirmed figures indexed from public
              relief records.
            </p>

          </div>

          <div className="sync-indicator">
            <span />
            Ledger synchronized
          </div>

        </div>

        <div className="summary-grid">

          <article className="summary-card">

            <div className="summary-icon">
              <Landmark
                size={19}
              />
            </div>

            <div>

              <span>
                Funds received
              </span>

              <strong>
                {summary
                  ? money(
                      summary.received_paise,
                    )
                  : '—'}
              </strong>

              <small>
                Registered funding sources
              </small>

            </div>

          </article>

          <article className="summary-card">

            <div className="summary-icon">
              <MapPin
                size={19}
              />
            </div>

            <div>

              <span>
                Funds allocated
              </span>

              <strong>
                {summary
                  ? money(
                      summary.allocated_paise,
                    )
                  : '—'}
              </strong>

              <small>
                District allocations
              </small>

            </div>

          </article>

          <article className="summary-card summary-card-emphasis">

            <div className="summary-icon">
              <WalletCards
                size={19}
              />
            </div>

            <div>

              <span>
                Total relief sent
              </span>

              <strong>
                {summary
                  ? money(
                      summary.disbursed_paise,
                    )
                  : '—'}
              </strong>

              <small>
                {summary
                  ? `${money(
                      summary.pending_paise,
                    )} pending`
                  : '—'}
              </small>

            </div>

          </article>

          <article className="summary-card">

            <div className="summary-icon">
              <ShieldCheck
                size={19}
              />
            </div>

            <div>

              <span>
                Available balance
              </span>

              <strong>
                {summary
                  ? money(
                      summary.remaining_paise,
                    )
                  : '—'}
              </strong>

              <small>
                Remaining public balance
              </small>

            </div>

          </article>

        </div>

      </section>

      {/* ================================================================== */}
      {/* DISTRICT DISTRIBUTION                                              */}
      {/* ================================================================== */}

      <section
        id="districts"
        className="section districts-section"
      >

        <div className="section-heading">

          <div>

            <span className="section-kicker">
              02 · WHERE IT WENT
            </span>

            <h2>
              District-wise relief
            </h2>

            <p>
              See how recorded assistance is distributed.
            </p>

          </div>

          <div className="district-count">

            {
              fundedDistricts.length
            }

            <span>
              funded
            </span>

          </div>

        </div>

        {/* ================================================================ */}
        {/* COMPONENT                                                        */}
        {/* ================================================================ */}

        <DistrictDistribution
          districts={
            districts
          }

          selectedDistrict={
            selectedDistrict
          }

          onSelect={
            handleDistrictSelect
          }
        />

      </section>

      {/* ================================================================== */}
      {/* MONEY FLOW                                                         */}
      {/* ================================================================== */}

      <section
        id="flow"
        className="section flow-section"
      >

        <div className="section-heading">

          <div>

            <span className="section-kicker">
              03 · FOLLOW THE MONEY
            </span>

            <h2>
              From fund to family
            </h2>

            <p>
              Each handoff becomes part of the public
              record.
            </p>

          </div>

        </div>

        <div className="flow-card">

          <div className="flow-step">

            <div className="flow-icon">
              <Landmark
                size={21}
              />
            </div>

            <span>
              FUNDS RECEIVED
            </span>

            <strong>
              {summary
                ? money(
                    summary.received_paise,
                  )
                : '—'}
            </strong>

            <small>
              Government / NGO
            </small>

          </div>

          <div className="flow-arrow">
            <ArrowRight
              size={15}
            />
          </div>

          <div className="flow-step">

            <div className="flow-icon">
              <MapPin
                size={21}
              />
            </div>

            <span>
              ALLOCATED
            </span>

            <strong>
              {summary
                ? money(
                    summary.allocated_paise,
                  )
                : '—'}
            </strong>

            <small>
              District + scheme
            </small>

          </div>

          <div className="flow-arrow">
            <ArrowRight
              size={15}
            />
          </div>

          <div className="flow-step">

            <div className="flow-icon">
              <Users
                size={21}
              />
            </div>

            <span>
              DISBURSED
            </span>

            <strong>
              {summary
                ? money(
                    summary.disbursed_paise,
                  )
                : '—'}
            </strong>

            <small>
              Families reached
            </small>

          </div>

          <div className="flow-arrow">
            <ArrowRight
              size={15}
            />
          </div>

          <div className="flow-step">

            <div className="flow-icon">
              <ShieldCheck
                size={21}
              />
            </div>

            <span>
              ON LEDGER
            </span>

            <strong>
              Recorded
            </strong>

            <small>
              Hyperledger Fabric
            </small>

          </div>

        </div>

      </section>

      {/* ================================================================== */}
      {/* VERIFY                                                             */}
      {/* ================================================================== */}

      <section
        id="verify"
        className="section verify-section"
      >

        <div className="verify-layout">

          <div className="verify-copy">

            <span className="section-kicker">
              04 · PUBLIC VERIFICATION
            </span>

            <h2>
              Verify a payment
              <br />
              yourself.
            </h2>

            <p>
              Enter the public reference printed on a
              beneficiary receipt to inspect the recorded
              transaction.
            </p>

            <div className="verify-benefits">

              <div>
                <CheckCircle2
                  size={16}
                />

                Public payment reference
              </div>

              <div>
                <CheckCircle2
                  size={16}
                />

                Payment status
              </div>

              <div>
                <CheckCircle2
                  size={16}
                />

                Ledger commitment time
              </div>

            </div>

          </div>

          <div className="verify-card">

            <div className="verify-card-heading">

              <div className="verify-icon">
                <ReceiptText
                  size={19}
                />
              </div>

              <div>

                <h3>
                  Check ledger proof
                </h3>

                <span>
                  Reference format: RC-YYYY-XXXXXXXX
                </span>

              </div>

            </div>

            <form
              onSubmit={
                verifyPayment
              }
              className="verify-form"
            >

              <label htmlFor="reference">
                Public reference
              </label>

              <input
                id="reference"
                value={
                  reference
                }
                onChange={(
                  event,
                ) =>
                  setReference(
                    event.target.value,
                  )
                }
                placeholder="RC-2026-XXXXXXXX"
                autoComplete="off"
              />

              <button
                type="submit"
                className="verify-button"
                disabled={
                  verifying
                }
              >

                {verifying
                  ? 'Checking...'
                  : 'Check ledger proof'}

                {!verifying && (
                  <ArrowRight
                    size={16}
                  />
                )}

              </button>

            </form>

            {verifyError && (
              <div className="verify-error">
                {verifyError}
              </div>
            )}

            {proof && (
              <div className="proof-result">

                <div className="proof-status">

                  <span />

                  {
                    proof.status
                  }

                </div>

                <strong className="proof-amount">

                  {money(
                    proof.amount_paise,
                  )}

                </strong>

                <span className="proof-location">

                  {
                    proof.district_code
                  }

                  {' · '}

                  {
                    proof.scheme_name
                  }

                </span>

                <div className="proof-grid">

                  <div>

                    <span>
                      Transaction
                    </span>

                    <strong>
                      {
                        proof.proof
                          .transactionId
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Committed
                    </span>

                    <strong>
                      {new Date(
                        proof.proof.committedAt,
                      ).toLocaleString(
                        'en-IN',
                      )}
                    </strong>

                  </div>

                </div>

              </div>
            )}

            <div className="privacy-note">

              <LockKeyhole
                size={15}
              />

              <span>
                Only transaction facts are exposed
                publicly. Beneficiary credentials remain
                private.
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      <footer className="public-footer">

        <div>

          <strong>
            ReliefChain
          </strong>

          <span>
            Direct aid. Transparent impact.
          </span>

        </div>

        <span>
          {summary?.source ===
          'FABRIC_INDEX'
            ? 'Indexed from Hyperledger Fabric'
            : 'Public relief ledger'}
        </span>

        <span>
          Synthetic demonstration data
        </span>

      </footer>

    </main>
  );
}