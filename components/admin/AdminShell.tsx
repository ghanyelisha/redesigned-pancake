"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bus,
  LayoutDashboard,
  Route,
  BookOpen,
  LogOut,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { subscribeAdminAuth, adminLogout } from '../../lib/adminAuth';
import type { User } from 'firebase/auth';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/journeys', label: 'Journeys', icon: Route },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // All hooks must be called unconditionally — bypass logic is handled in render
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Don't subscribe to auth on the login page — it manages its own auth state
    if (isLoginPage) return;

    const unsub = subscribeAdminAuth((u) => {
      setUser(u);
      if (!u) {
        document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.replace('/admin/login');
      }
    });
    return unsub;
  }, [isLoginPage, router]);

  async function logout() {
    await adminLogout();
    router.replace('/admin/login');
  }

  // ── Login page: render bare children with no shell or auth guard ──
  if (isLoginPage) {
    return <>{children}</>;
  }

  // ── Protected pages: show spinner while Firebase resolves auth state ──
  if (user === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verifying session…</span>
        </div>
      </div>
    );
  }

  // Null user after load → middleware already redirected; return null as safety net
  if (!user) return null;

  const Sidebar = (
    <aside className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700/60 shrink-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow">
          <Bus className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="text-sm font-bold leading-none">MyBus</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Admin panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Main Menu
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-700/60 shrink-0 space-y-2">
        <div className="flex items-center gap-2 px-3">
          <div className="w-8 h-8 rounded-full bg-teal-600/20 border border-teal-600/40 flex items-center justify-center text-xs font-bold text-teal-400">
            {user.email?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.email}</p>
            <p className="text-[10px] text-slate-400">Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 md:z-20">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">{Sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-60 min-h-screen">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">MyBus Admin</span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
