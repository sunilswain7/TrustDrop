'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  display_name: string | null;
  trust_score: number;
  locus_wallet_address: string;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Trust<span className="text-emerald-400">Drop</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition">
            Browse
          </Link>
          <Link href="/sell" className="text-sm text-zinc-400 hover:text-white transition">
            Sell
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard/seller" className="text-sm text-zinc-400 hover:text-white transition">
                My Sales
              </Link>
              <Link href="/dashboard/buyer" className="text-sm text-zinc-400 hover:text-white transition">
                My Purchases
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                  Trust: {user.trust_score}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {user.locus_wallet_address.slice(0, 6)}...{user.locus_wallet_address.slice(-4)}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-zinc-500 hover:text-red-400 transition ml-1"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
