'use client';

import {
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  LockKeyhole,
} from 'lucide-react';

import {
  FormEvent,
  useState,
} from 'react';

import {
  api,
  money,
} from '@/lib/api';

import {
  getDistrictName,
} from '@/lib/districtMap';

type Proof = {
  found: boolean;

  public_reference?: string;

  amount_paise?: number;

  status?: string;

  status_description?: string;

  district_code?: string;

  scheme_name?: string;

  source_type?: string;

  proof?: {
    transactionId?: string;
    committedAt?: string;
  };
};

function formatDate(
  value?: string,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export default function PaymentVerifier() {
  const [
    reference,
    setReference,
  ] =
    useState('');

  const [proof, setProof] =
    useState<Proof | null>(
      null,
    );

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  async function verify(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      reference.trim();

    if (!value) {
      setError(
        'Enter a public payment reference.',
      );

      setProof(null);

      return;
    }

    setLoading(true);
    setError('');
    setProof(null);

    try {
      const result =
        await api<Proof>(
          `/public/proof/${encodeURIComponent(
            value,
          )}`,
        );

      if (
        result.found === false
      ) {
        throw new Error(
          'No payment was found for this reference.',
        );
      }

      setProof(result);
    } catch (
      verificationError
    ) {
      setError(
        verificationError instanceof
          Error
          ? verificationError.message
          : 'Unable to verify payment.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="page-section verify-section"
      id="verify"
    >
      <div className="verify-layout">
        <div className="verify-copy">
          <span className="section-kicker">
            04 · Public verification
          </span>

          <h2>
            Verify a payment
            <br />
            yourself.
          </h2>

          <p>
            Enter the public
            reference printed on a
            beneficiary receipt to
            inspect the recorded
            transaction.
          </p>

          <div className="verify-checks">
            <div>
              <CheckCircle2
                size={17}
              />
              Public payment reference
            </div>

            <div>
              <CheckCircle2
                size={17}
              />
              Payment status
            </div>

            <div>
              <CheckCircle2
                size={17}
              />
              Ledger commitment time
            </div>
          </div>
        </div>

        <div className="verify-card">
          <div className="verify-card-top">
            <div className="verify-card-icon">
              <Fingerprint
                size={22}
              />
            </div>

            <div>
              <h3>
                Check ledger proof
              </h3>

              <span>
                Public transaction
                verification
              </span>
            </div>
          </div>

          <form
            className="verify-form"
            onSubmit={verify}
          >
            <label htmlFor="reference">
              Public reference
            </label>

            <input
              id="reference"
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="RC-2026-XXXXXXXX"
              autoComplete="off"
            />

            <button
              className="button button-primary verify-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Checking ledger...'
                : 'Check ledger proof'}

              {!loading && (
                <ChevronRight
                  size={17}
                />
              )}
            </button>
          </form>

          {error && (
            <div className="verify-error">
              {error}
            </div>
          )}

          {proof && (
            <div className="proof-result">
              <div className="proof-status">
                <span />
                {proof.status ||
                  'FOUND'}
              </div>

              <div className="proof-amount">
                {money(
                  proof.amount_paise,
                )}
              </div>

              <div className="proof-location">
                {getDistrictName(
                  proof.district_code ||
                    '',
                )}{' '}
                ·{' '}
                {proof.scheme_name ||
                  '—'}
              </div>

              <div className="proof-meta">
                <div>
                  <span>
                    Reference
                  </span>

                  <strong>
                    {proof.public_reference ||
                      reference}
                  </strong>
                </div>

                <div>
                  <span>
                    Transaction
                  </span>

                  <strong>
                    {proof.proof
                      ?.transactionId ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>
                    Committed
                  </span>

                  <strong>
                    {formatDate(
                      proof.proof
                        ?.committedAt,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {proof.status_description ||
                      '—'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="privacy-note">
            <LockKeyhole
              size={16}
            />

            <span>
              Only transaction facts
              are exposed publicly.
              Beneficiary credentials
              remain private.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}