"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Route,
  BookOpen,
  DollarSign,
  Armchair,
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { getDashboardStats, fmtFCFA, fmtDate, type DashboardStats } from '../../../lib/adminFirestore';

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    active: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const cls = map[s] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status ?? '—'}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setStats(await getDashboardStats());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Metric cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 h-28 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Route}
            label="Journeys Today"
            value={String(stats.totalJourneysToday)}
            color="bg-teal-50 text-teal-700"
          />
          <MetricCard
            icon={BookOpen}
            label="Bookings Today"
            value={String(stats.totalBookingsToday)}
            color="bg-blue-50 text-blue-700"
          />
          <MetricCard
            icon={DollarSign}
            label="Revenue Today"
            value={fmtFCFA(stats.revenueToday)}
            sub="Confirmed payments only"
            color="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            icon={Armchair}
            label="Seats Sold"
            value={`${stats.seatsSoldToday} / ${stats.totalSeatsToday}`}
            sub="Sold vs total today"
            color="bg-violet-50 text-violet-700"
          />
        </div>
      ) : null}

      {/* Tables row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's upcoming journeys */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                Today&apos;s Journeys
              </h2>
              <Link href="/admin/journeys" className="text-xs text-teal-600 font-medium hover:underline">
                View all →
              </Link>
            </div>
            {stats.upcomingJourneys.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No journeys today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Route</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Operator</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.upcomingJourneys.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {j.origin} → {j.destination}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{j.departureTime}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[100px]">{j.operatorName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={j.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Recent Bookings
              </h2>
              <Link href="/admin/bookings" className="text-xs text-teal-600 font-medium hover:underline">
                View all →
              </Link>
            </div>
            {stats.recentBookings.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Ref</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Passenger</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Route</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Seat</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recentBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {b.bookingReference}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {b.passengerName} {b.passengerSurname}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {(b as any).origin} → {(b as any).destination}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{b.seatNumber}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
