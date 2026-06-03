"use client";
import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Download, CheckCircle2, XCircle, ArrowLeftRight, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getAllBookings,
  confirmBooking,
  cancelBookingAdmin,
  changeSeatAdmin,
  fmtFCFA,
  fmtDate,
} from '../../../lib/adminFirestore';
import { fetchSeatMap } from '../../../lib/firestore';
import type { Booking, SeatMap } from '../../../lib/firestore';

const PAGE_SIZE = 20;

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status ?? '—'}
    </span>
  );
}

// CSV export helper
function exportCSV(rows: Booking[]) {
  const headers = [
    'Booking Ref', 'Passenger Name', 'Phone', 'Origin', 'Destination',
    'Journey Date', 'Seat', 'Luggage', 'Payment Method', 'Payment Status', 'Amount'
  ];
  const lines = rows.map((b) => [
    b.bookingReference,
    `${b.passengerName} ${b.passengerSurname}`,
    b.passengerPhone,
    (b as any).origin ?? '',
    (b as any).destination ?? '',
    fmtDate((b as any).departureDate ?? ''),
    b.seatNumber,
    b.luggageSize ?? '',
    b.paymentMethod ?? '',
    b.paymentStatus,
    b.totalAmount,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function BookingsPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRoute, setFilterRoute] = useState('');

  // Row actions
  const [actioning, setActioning] = useState<string | null>(null);
  const [changeSeatBooking, setChangeSeatBooking] = useState<Booking | null>(null);
  const [changeSeatMap, setChangeSeatMap] = useState<SeatMap | null>(null);
  const [changingSeat, setChangingSeat] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setAllBookings(await getAllBookings()); }
    catch (e: any) { setError(e.message ?? 'Failed to load bookings'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Unique routes from bookings
  const routes = useMemo(() => {
    const set = new Set<string>();
    allBookings.forEach((b) => {
      const o = (b as any).origin; const d = (b as any).destination;
      if (o && d) set.add(`${o}→${d}`);
    });
    return Array.from(set).sort();
  }, [allBookings]);

  // Filtered bookings
  const filtered = useMemo(() => {
    let rows = allBookings;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((b) =>
        b.bookingReference?.toLowerCase().includes(q) ||
        `${b.passengerName} ${b.passengerSurname}`.toLowerCase().includes(q) ||
        b.passengerPhone?.includes(q)
      );
    }
    if (filterStatus) rows = rows.filter((b) => b.paymentStatus === filterStatus);
    if (filterDate) rows = rows.filter((b) => (b as any).departureDate === filterDate);
    if (filterRoute) {
      const [o, d] = filterRoute.split('→');
      rows = rows.filter((b) => (b as any).origin === o && (b as any).destination === d);
    }
    return rows;
  }, [allBookings, search, filterStatus, filterDate, filterRoute]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, filterStatus, filterDate, filterRoute]);

  async function handleConfirm(id: string) {
    setActioning(id);
    try { await confirmBooking(id); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setActioning(null); }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking and release the seat?')) return;
    setActioning(id);
    try { await cancelBookingAdmin(id); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setActioning(null); }
  }

  async function openChangeSeat(booking: Booking) {
    try {
      const sm = await fetchSeatMap(booking.journeyId);
      setChangeSeatMap(sm);
      setChangeSeatBooking(booking);
    } catch (e: any) { alert(e.message); }
  }

  async function handleChangeSeat(newSeat: string) {
    if (!changeSeatBooking) return;
    setChangingSeat(true);
    try {
      await changeSeatAdmin(changeSeatBooking.id!, changeSeatBooking.journeyId, changeSeatBooking.seatNumber, newSeat);
      setChangeSeatBooking(null); setChangeSeatMap(null);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setChangingSeat(false); }
  }

  const inputCls = 'px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 bg-white transition-colors';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {allBookings.length} bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-teal-300 disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all bg-white">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, name, phone…"
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} className={inputCls}>
            <option value="">All routes</option>
            {routes.map((r) => <option key={r} value={r}>{r.replace('→', ' → ')}</option>)}
          </select>

          <input
            type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className={inputCls}
            title="Filter by journey date"
          />

          {(search || filterStatus || filterRoute || filterDate) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterRoute(''); setFilterDate(''); }}
              className="text-xs text-teal-700 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Ref', 'Passenger', 'Phone', 'Route', 'Date', 'Seat',
                  'Luggage', 'Method', 'Status', 'Amount', 'Actions'
                ].map((h) => (
                  <th key={h} className="px-3 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && pageRows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 11 }).map((__, j) => (
                    <td key={j} className="px-3 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-400">No bookings match the current filters.</td></tr>
              ) : (
                pageRows.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-mono font-semibold text-slate-700">{b.bookingReference}</td>
                    <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">{b.passengerName} {b.passengerSurname}</td>
                    <td className="px-3 py-3 text-slate-600">{b.passengerPhone}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {(b as any).origin} → {(b as any).destination}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate((b as any).departureDate)}</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">{b.seatNumber}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[110px] truncate">
                      {b.luggageSize && b.luggageSize !== 'No luggage'
                        ? `${b.luggageSize}${(b.luggageTypes?.length ?? 0) > 0 ? ` (${b.luggageTypes!.join(', ')})` : ''}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-600 capitalize">{b.paymentMethod ?? '—'}</td>
                    <td className="px-3 py-3"><PaymentBadge status={b.paymentStatus} /></td>
                    <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">{fmtFCFA(b.totalAmount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {b.paymentStatus === 'pending' && (
                          <button
                            disabled={actioning === b.id}
                            onClick={() => handleConfirm(b.id!)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {actioning === b.id ? '…' : 'Confirm'}
                          </button>
                        )}
                        <button
                          disabled={actioning === b.id}
                          onClick={() => openChangeSeat(b)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-teal-300 hover:text-teal-700 transition-colors"
                        >
                          <ArrowLeftRight className="h-3 w-3" />
                          Seat
                        </button>
                        {b.paymentStatus !== 'cancelled' && (
                          <button
                            disabled={actioning === b.id}
                            onClick={() => handleCancel(b.id!)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" />
                            {actioning === b.id ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i : Math.max(0, Math.min(totalPages - 7, page - 3)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${pg === page ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'}`}>
                    {pg + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Seat Modal */}
      {changeSeatBooking && changeSeatMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setChangeSeatBooking(null); setChangeSeatMap(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Change Seat</h3>
            <p className="text-xs text-slate-500 mb-4">
              Moving <strong>{changeSeatBooking.passengerName} {changeSeatBooking.passengerSurname}</strong> from seat <strong>{changeSeatBooking.seatNumber}</strong>.
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {Object.entries(changeSeatMap.seats)
                .filter(([, s]) => s.status === 'available')
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([num]) => (
                  <button key={num} disabled={changingSeat} onClick={() => handleChangeSeat(num)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-sm font-medium text-teal-800 hover:bg-teal-100 transition-colors disabled:opacity-50">
                    <span>Seat {num}</span>
                    <span className="text-xs text-teal-600">Available</span>
                  </button>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => { setChangeSeatBooking(null); setChangeSeatMap(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
