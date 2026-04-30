'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sunburst from '@/components/Sunburst';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromCheckout = searchParams.get('reason') === 'checkout';
  const [walletAddress, setWalletAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!walletAddress) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, displayName, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-12 bg-[var(--bg-cream)] relative overflow-hidden">
      {/* Background sunbursts */}
      <Sunburst color="var(--accent-yellow)" size={120} rotation={15}  className="absolute top-8  right-[8%]  opacity-30 hidden sm:block" />
      <Sunburst color="var(--accent-green)"  size={70}  rotation={-10} className="absolute bottom-12 left-[6%] opacity-30 hidden sm:block" />
      <Sunburst color="var(--accent-coral)"  size={50}  rotation={25}  className="absolute top-1/3 left-[3%] opacity-20 hidden lg:block" />

      <div className="relative z-10 w-full max-w-md">
        <div className="card-retro-static p-6 sm:p-8">

          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className="w-14 h-14 border-2 border-[var(--ink)] flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--accent-yellow)', boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
            >
              {isFromCheckout ? (
                <svg className="w-7 h-7 text-[var(--ink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-[var(--ink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a5 5 0 00-10 0v2M5 12h14a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                </svg>
              )}
            </div>

            <h1
              className="text-2xl sm:text-3xl text-[var(--ink)] mb-2"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              {isFromCheckout ? 'ACCESS DENIED' : 'CONNECT WALLET'}
            </h1>
            <p className="text-sm text-[var(--ink-soft)] font-medium">
              {isFromCheckout
                ? 'You need to connect your wallet before making a purchase.'
                : 'Enter your Locus wallet address to get started.'}
            </p>
          </div>

          {error && (
            <div className="border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-4 py-3 mb-6 text-sm font-semibold" style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div>
              <label className="label-uppercase">Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x…"
                required
                className="input-retro font-mono text-sm"
              />
              <p className="text-[11px] text-[var(--ink-soft)] mt-1.5 font-medium">
                Ensure this address accepts USDC on Base
              </p>
            </div>

            <div>
              <label className="label-uppercase">
                Display Name
                <span className="text-[var(--ink-soft)] font-normal normal-case ml-1 text-[10px]">(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="input-retro"
              />
            </div>

            <div>
              <label className="label-uppercase">
                Email
                <span className="text-[var(--ink-soft)] font-normal normal-case ml-1 text-[10px]">(optional, for receipts)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-retro"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !walletAddress}
              className="btn-primary w-full py-3 text-[14px] mt-6"
            >
              {loading ? 'Connecting…' : 'Connect Wallet →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
