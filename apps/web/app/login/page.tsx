'use client';

import {
  FormEvent,
  useState,
} from 'react';

import {
  ArrowRight,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

import {
  useRouter,
} from 'next/navigation';

import Link from 'next/link';

import {
  api,
} from '@/lib/api';

export default function Login() {
  const router =
    useRouter();

  const [
    email,
    setEmail,
  ] = useState(
    'gov@reliefchain.demo',
  );

  const [
    password,
    setPassword,
  ] = useState(
    'Relief@123',
  );

  const [
    error,
    setError,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const result =
        await api<{
          accessToken: string;
          user: {
            role: string;
          };
        }>(
          '/auth/login',
          {
            method: 'POST',

            body:
              JSON.stringify({
                email,
                password,
              }),
          },
        );

      localStorage.setItem(
        'reliefchain-token',
        result.accessToken,
      );

      localStorage.setItem(
        'reliefchain-user',
        JSON.stringify(
          result.user,
        ),
      );

      router.push(
        result.user.role ===
          'AUDITOR'
          ? '/auditor'
          : '/operator',
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">

      {/* ================================================================ */}
      {/* VISUAL SIDE                                                      */}
      {/* ================================================================ */}

      <section className="auth-visual">

        <div className="auth-visual-gradient" />

        <img
          src="/images/lighthouse.png"
          alt=""
          className="auth-lighthouse"
        />

        <div className="auth-visual-content">

          <div className="auth-visual-label">
            RELIEFCHAIN · SECURE ACCESS
          </div>

          <h2>
            Every handoff
            <br />
            should be visible.
          </h2>

          <p>
            Operational access to the same relief
            records shown on the public ledger.
          </p>

          <div className="auth-visual-meta">

            <div>
              <ShieldCheck
                size={15}
              />

              <span>
                Verified records
              </span>
            </div>

            <div>
              <Landmark
                size={15}
              />

              <span>
                Trusted institutions
              </span>
            </div>

          </div>

        </div>

        <div className="auth-visual-location">
          ASSAM · INDIA
        </div>

      </section>

      {/* ================================================================ */}
      {/* LOGIN SIDE                                                        */}
      {/* ================================================================ */}

      <section className="auth-panel">

        <div className="auth-panel-inner">

          <Link
            href="/"
            className="auth-brand"
          >
            <span className="auth-brand-mark">
              R
            </span>

            <span>
              ReliefChain
            </span>
          </Link>

          <div className="auth-heading">

            <span>
              INSTITUTION ACCESS
            </span>

            <h1>
              Welcome back.
            </h1>

            <p>
              Secure access for relief operators and
              oversight teams.
            </p>

          </div>

          <form
            onSubmit={submit}
            className="auth-form"
          >

            <div className="auth-field">

              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value,
                  )
                }
                type="email"
                autoComplete="email"
              />

            </div>

            <div className="auth-field">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value,
                  )
                }
                type="password"
                autoComplete="current-password"
              />

            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Signing in...'
                  : 'Continue securely'}
              </span>

              {!loading && (
                <ArrowRight
                  size={16}
                />
              )}
            </button>

          </form>

          <div className="auth-security">

            <ShieldCheck
              size={15}
            />

            <span>
              Credentials are used only for authenticated
              institutional access.
            </span>

          </div>

        </div>

      </section>

    </main>
  );
}