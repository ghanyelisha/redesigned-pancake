"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Route, BookOpen, DollarSign, Armchair, TrendingUp, RefreshCw,
  Clock, AlertCircle, Users, Globe, BarChart2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  getDashboardStats, fmtFCFA, fmtDate,
  getAllTimeStats, getMonthlyRevenue, getTopRoutes, getRecentActivity,
  getAllJourneysWithStats,
  type DashboardStats, type AllTimeStats, type MonthlyRevenue,
  type TopRoute, type ActivityEvent, type JourneyWithStats,
} from '../../../lib/adminFirestore';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    active: 'bg-teal-50 text-teal-700 border-teal-200',
    departed: 'bg-slate-100 text-slate-700 border-slate-200',
    expired: 'bg-red-50 text-red-600 border-red-200',
  };
  const cls = map[s] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {status ?? '—'}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Canvas bar chart ─────────────────────────────────────────────────────────

/** Manual rounded-rect path — fallback for browsers without ctx.roundRect */
function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (h <= 0) return;
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawChart(canvas: HTMLCanvasElement, data: MonthlyRevenue[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx || data.length === 0) return;

  // Match canvas intrinsic size to its CSS-rendered size × devicePixelRatio
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth;
  const cssH = Math.round(cssW * (260 / 700)); // maintain ~2.7:1 aspect
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.height = cssH + 'px';
  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;
  const padL = 64, padR = 16, padT = 16, padB = 44;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const slotW = chartW / data.length;
  const barW = Math.max(slotW * 0.55, 4);
  const barOffset = (slotW - barW) / 2;

  // ── Horizontal gridlines + Y labels ──────────────────────────────────────
  const gridLines = 5;
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + chartH - (i / gridLines) * chartH;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#e2e8f0';
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();

    const val = (maxRev * i) / gridLines;
    const label =
      val >= 1_000_000
        ? (val / 1_000_000).toFixed(1) + 'M'
        : val >= 1_000
        ? Math.round(val / 1_000) + 'K'
        : String(Math.round(val));
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.max(9, Math.round(W / 80))}px -apple-system,sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(label, padL - 6, y);
  }

  // ── Bars ──────────────────────────────────────────────────────────────────
  data.forEach((d, i) => {
    const rawH = (d.revenue / maxRev) * chartH;
    const barH = Math.max(rawH, d.revenue > 0 ? 2 : 0); // min visible pixel
    const x = padL + i * slotW + barOffset;
    const y = padT + chartH - barH;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, y, 0, padT + chartH);
    grad.addColorStop(0, '#0f766e');
    grad.addColorStop(1, '#5eead4');
    ctx.fillStyle = grad;
    roundedBar(ctx, x, y, barW, barH, 4);
    ctx.fill();

    // Value label above bar (only if bar is tall enough)
    if (barH > 18 && d.revenue > 0) {
      const valStr =
        d.revenue >= 1_000_000
          ? (d.revenue / 1_000_000).toFixed(1) + 'M'
          : d.revenue >= 1_000
          ? Math.round(d.revenue / 1_000) + 'K'
          : String(d.revenue);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(8, Math.round(W / 90))}px -apple-system,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valStr, x + barW / 2, y + Math.min(barH / 2, 12));
    }

    // X-axis label (month / period)
    const lbl = d.label.split(' ');
    const fontSize = Math.max(8, Math.round(W / 95));
    ctx.fillStyle = '#64748b';
    ctx.font = `${fontSize}px -apple-system,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(lbl[0], x + barW / 2, padT + chartH + 6);
    if (lbl[1]) ctx.fillText(lbl[1], x + barW / 2, padT + chartH + 6 + fontSize + 2);
  });

  // ── Left axis line ────────────────────────────────────────────────────────
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + chartH);
  ctx.stroke();
}

function RevenueChart({ data, grouping }: { data: MonthlyRevenue[]; grouping: 'monthly' | 'weekly' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Redraw whenever data changes or the container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    // Initial draw
    drawChart(canvas, data);

    // Resize observer keeps the chart sharp when sidebar toggles or window resizes
    const ro = new ResizeObserver(() => drawChart(canvas, data));
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        // intrinsic size is set dynamically in drawChart; these are just initial placeholders
        width={700}
        height={260}
        className="w-full block"
        aria-label={`${grouping} confirmed revenue bar chart`}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const JOURNEY_PAGE_SIZE = 10;
type StatusFilter = 'all' | 'active' | 'departed' | 'cancelled';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null);
  const [chartData, setChartData] = useState<MonthlyRevenue[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [allJourneys, setAllJourneys] = useState<JourneyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chart controls
  const [chartGrouping, setChartGrouping] = useState<'monthly' | 'weekly'>('monthly');

  // Journey overview table controls
  const [journeyPage, setJourneyPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, at, cd, tr, act, jrn] = await Promise.all([
        getDashboardStats(),
        getAllTimeStats(),
        getMonthlyRevenue(12),
        getTopRoutes(),
        getRecentActivity(),
        getAllJourneysWithStats(),
      ]);
      setStats(s);
      setAllTime(at);
      setChartData(cd);
      setTopRoutes(tr);
      setActivity(act);
      setAllJourneys(jrn);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // Filtered journey table
  const filteredJourneys = allJourneys.filter((j) => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (dateFrom && j.departureDate < dateFrom) return false;
    if (dateTo && j.departureDate > dateTo) return false;
    return true;
  });
  const journeyPages = Math.ceil(filteredJourneys.length / JOURNEY_PAGE_SIZE);
  const journeyRows = filteredJourneys.slice(
    journeyPage * JOURNEY_PAGE_SIZE,
    journeyPage * JOURNEY_PAGE_SIZE + JOURNEY_PAGE_SIZE
  );

  const inputCls = 'px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white transition-colors';

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Row 1: Daily metric cards ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Today</h2>
        {loading && !stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => <div key={n} className="bg-white rounded-2xl border border-slate-200 h-28 animate-pulse" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Route} label="Journeys Today" value={String(stats.totalJourneysToday)} color="bg-teal-50 text-teal-700" />
            <MetricCard icon={BookOpen} label="Bookings Today" value={String(stats.totalBookingsToday)} color="bg-blue-50 text-blue-700" />
            <MetricCard icon={DollarSign} label="Revenue Today" value={fmtFCFA(stats.revenueToday)} sub="Confirmed only" color="bg-emerald-50 text-emerald-700" />
            <MetricCard icon={Armchair} label="Seats Sold" value={`${stats.seatsSoldToday} / ${stats.totalSeatsToday}`} sub="Sold vs total today" color="bg-violet-50 text-violet-700" />
          </div>
        ) : null}
      </section>

      {/* ── Row 2: All-time metric cards ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">All Time</h2>
        {loading && !allTime ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => <div key={n} className="bg-white rounded-2xl border border-slate-200 h-28 animate-pulse" />)}
          </div>
        ) : allTime ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard icon={BookOpen} label="Total Bookings" value={String(allTime.totalBookings)} color="bg-blue-50 text-blue-700" />
            <MetricCard icon={DollarSign} label="Confirmed Revenue" value={fmtFCFA(allTime.totalConfirmedRevenue)} color="bg-emerald-50 text-emerald-700" />
            <MetricCard icon={Route} label="Total Journeys" value={String(allTime.totalJourneys)} color="bg-teal-50 text-teal-700" />
            <MetricCard icon={Users} label="Passengers Served" value={String(allTime.totalPassengersServed)} sub="Confirmed bookings" color="bg-violet-50 text-violet-700" />
            <MetricCard icon={Globe} label="Routes Operated" value={String(allTime.totalRoutes)} sub="Distinct origin→dest" color="bg-amber-50 text-amber-700" />
          </div>
        ) : null}
      </section>

      {/* ── Revenue chart + Activity feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-teal-600" />
              Confirmed Revenue
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['monthly', 'weekly'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setChartGrouping(g)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                    chartGrouping === g ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} grouping={chartGrouping} />
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No recent activity.</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
              {activity.map((ev, i) => (
                <div key={i} className={`border-l-4 ${ev.borderColor} pl-3 py-1.5`}>
                  <p className="text-xs font-semibold text-slate-800">{ev.title}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{ev.detail}</p>
                  {ev.timestamp && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(ev.timestamp.toDate ? ev.timestamp.toDate() : new Date(ev.timestamp as any))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Today's journeys table ── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />Today&apos;s Journeys
              </h2>
              <Link href="/admin/journeys" className="text-xs text-teal-600 font-medium hover:underline">View all →</Link>
            </div>
            {stats.upcomingJourneys.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No journeys today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Route', 'Time', 'Bus Code', 'Driver', 'Seats', 'Booked', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.upcomingJourneys.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{j.origin} → {j.destination}</td>
                        <td className="px-3 py-2.5 text-slate-600">{j.departureTime}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{j.busCode}</td>
                        <td className="px-3 py-2.5 text-slate-600 truncate max-w-[80px]">{j.driverName ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600">{j.totalSeats}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600">—</td>
                        <td className="px-3 py-2.5"><StatusBadge status={j.status} /></td>
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
                <TrendingUp className="h-4 w-4 text-teal-600" />Recent Bookings
              </h2>
              <Link href="/admin/bookings" className="text-xs text-teal-600 font-medium hover:underline">View all →</Link>
            </div>
            {stats.recentBookings.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Ref', 'Passenger', 'Route', 'Seat', 'Payment'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recentBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{b.bookingReference}</td>
                        <td className="px-3 py-2.5 text-slate-800">{b.passengerName} {b.passengerSurname}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{(b as any).origin} → {(b as any).destination}</td>
                        <td className="px-3 py-2.5 text-slate-600">{b.seatNumber}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={b.paymentStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top routes ── */}
      {topRoutes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Top 5 Routes</h2>
          <div className="space-y-3">
            {topRoutes.map((r, i) => (
              <div key={r.route} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{r.route}</p>
                  <p className="text-xs text-slate-500">{r.totalBookings} bookings · {fmtFCFA(r.totalRevenue)} revenue · {r.avgOccupancy}% avg occupancy</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All journeys overview table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-slate-800">All Journeys Overview</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setJourneyPage(0); }} className={inputCls}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="departed">Departed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setJourneyPage(0); }} className={inputCls} title="From date" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setJourneyPage(0); }} className={inputCls} title="To date" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Route', 'Date', 'Time', 'Type', 'Class', 'Driver', 'Total', 'Booked', 'Occupancy %', 'Revenue', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journeyRows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400">No journeys match the selected filters.</td></tr>
              ) : journeyRows.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{j.origin} → {j.destination}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(j.departureDate)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{j.departureTime}</td>
                  <td className="px-3 py-2.5 text-slate-600">{j.busType}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${j.journeyClass === 'VIP' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{j.journeyClass}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 truncate max-w-[90px]">{j.driverName ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">{j.totalSeats}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">{j.bookedSeats}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${j.occupancyPct >= 80 ? 'text-teal-700' : j.occupancyPct >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>{j.occupancyPct}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-semibold whitespace-nowrap">{fmtFCFA(j.confirmedRevenue)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={j.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {journeyPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {journeyPage + 1} of {journeyPages} · {filteredJourneys.length} journeys
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setJourneyPage((p) => Math.max(0, p - 1))} disabled={journeyPage === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setJourneyPage((p) => Math.min(journeyPages - 1, p + 1))} disabled={journeyPage === journeyPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
