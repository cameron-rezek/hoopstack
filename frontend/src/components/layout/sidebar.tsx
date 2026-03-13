'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Shield, Trophy, ArrowRightLeft, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/teams', label: 'Teams', icon: Shield },
  { href: '/compare', label: 'Compare', icon: ArrowRightLeft },
  { href: '/leaderboards', label: 'Leaderboards', icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-56 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-card)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]">
          <BarChart3 className="h-4.5 w-4.5 text-white" />
        </div>
        <Link href="/" className="text-lg font-bold text-[var(--text-primary)]">
          Hoopstack
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-[var(--border-subtle)]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
              )}
              <item.icon className={cn(
                'h-[18px] w-[18px] transition-colors',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]',
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-subtle)] px-6 py-4">
        <p className="text-[10px] text-[var(--text-tertiary)]">
          NBA Analytics Platform
        </p>
      </div>
    </aside>
  );
}
