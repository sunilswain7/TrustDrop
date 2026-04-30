'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  display_name: string | null;
  trust_score: number;
  locus_wallet_address: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = () => setShowDropdown(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showDropdown]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setUser(null);
      setShowDropdown(false);
      setMobileOpen(false);
      router.push('/');
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setDisconnecting(false);
    }
  }, [router]);

  const truncatedWallet = user
    ? `${user.locus_wallet_address.slice(0, 6)}...${user.locus_wallet_address.slice(-4)}`
    : '';

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function BrowseLink({ mobile = false }: { mobile?: boolean }) {
    return (
      <a
        href="/#browse"
        onClick={(e) => {
          e.preventDefault();
          setMobileOpen(false);
          if (pathname === '/') {
            document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            router.push('/#browse');
          }
        }}
        className={`pill-nav ${pathname === '/' ? 'pill-nav-active' : ''} ${mobile ? 'w-full justify-center' : ''}`}
      >
        Browse
      </a>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-cream)] border-b-2 border-[var(--ink)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <Link
          href="/"
          className="shrink-0 hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          TRUST<span style={{ color: 'var(--accent-green)' }}>DROP</span>
        </Link>

        {/* Desktop center pills */}
        <div className="hidden md:flex items-center gap-2">
          <BrowseLink />
          <Link href="/sell" className={`pill-nav ${isActive('/sell') ? 'pill-nav-active' : ''}`}>
            Sell
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard/seller"
                className={`pill-nav ${isActive('/dashboard/seller') ? 'pill-nav-active' : ''}`}
              >
                Sales
              </Link>
              <Link
                href="/dashboard/buyer"
                className={`pill-nav ${isActive('/dashboard/buyer') ? 'pill-nav-active' : ''}`}
              >
                Purchases
              </Link>
            </>
          )}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDropdown((v) => !v); }}
                className="pill-nav flex items-center gap-2"
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                <span className="font-mono text-[12px]">{truncatedWallet}</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-150 ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-cream-alt)] border-2 border-[var(--ink)] z-50"
                  style={{ boxShadow: '4px 4px 0 0 var(--shadow-hard)' }}
                >
                  <div className="px-4 py-3 border-b-2 border-[var(--ink)]">
                    <p className="label-uppercase" style={{ marginBottom: 2 }}>Connected</p>
                    <p className="text-[11px] font-mono text-[var(--ink)] break-all">{user.locus_wallet_address}</p>
                    {user.display_name && (
                      <p className="text-[12px] font-semibold text-[var(--accent-green)] mt-1">{user.display_name}</p>
                    )}
                  </div>
                  <div>
                    <Link
                      href="/dashboard/seller"
                      className="block px-4 py-2 text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--accent-yellow)] transition-colors"
                    >
                      My Sales
                    </Link>
                    <Link
                      href="/dashboard/buyer"
                      className="block px-4 py-2 text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--accent-yellow)] transition-colors"
                    >
                      My Purchases
                    </Link>
                  </div>
                  <div className="border-t-2 border-[var(--ink)]">
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="w-full text-left px-4 py-2 text-[13px] font-semibold text-[var(--accent-coral)] hover:bg-[var(--accent-coral)] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-[12px] py-2 px-4">
              Connect Wallet
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1.5 border-2 border-[var(--ink)] bg-[var(--bg-cream-alt)]"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--bg-cream)] border-t-2 border-[var(--ink)] px-4 py-4 flex flex-col gap-2">
          <BrowseLink mobile />
          <Link
            href="/sell"
            className={`pill-nav justify-center ${isActive('/sell') ? 'pill-nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            Sell
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard/seller"
                className={`pill-nav justify-center ${isActive('/dashboard/seller') ? 'pill-nav-active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Sales
              </Link>
              <Link
                href="/dashboard/buyer"
                className={`pill-nav justify-center ${isActive('/dashboard/buyer') ? 'pill-nav-active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Purchases
              </Link>
              <div className="border-t-2 border-[var(--ink)] pt-3 mt-1 space-y-2">
                <p className="text-[11px] font-mono text-[var(--ink-soft)] text-center">{truncatedWallet}</p>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="btn-destructive w-full justify-center text-[12px]"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </>
          ) : (
            <Link href="/login" className="btn-primary justify-center" onClick={() => setMobileOpen(false)}>
              Connect Wallet
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
