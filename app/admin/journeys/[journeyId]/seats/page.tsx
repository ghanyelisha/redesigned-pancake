"use client";
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { getBookingsForJourney, getSeatCounts } from '../../../../../lib/adminFirestore';
import { listenSeatMap, getJourneyById } from '../../../../../lib/firestore';
import type { Journey, Booking, SeatMap } from '../../../../../lib/firestore';
import AdminSeatMap from '../../../../../components/admin/AdminSeatMap';

export default function AdminSeatsPage() {
  const { journeyId } = useParams<{ journeyId: string }>();
  const router = useRouter();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [counts, setCounts] = useState({ total: 0, booked: 0, held: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch bookings + journey (not live — refreshed on demand) ──────────────
  const loadBookingsAndJourney = useCallback(async () => {
    try {
      const [j, bks, cts] = await Promise.all([
        getJourneyById(journeyId),
        getBookingsForJourney(journeyId),
        getSeatCounts(journeyId),
      ]);
      setJourney(j);
      setBookings(bks);
      setCounts(cts);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data');
    }
  }, [journeyId]);

  // ── Live seat map listener ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError('');

    // Initial data load
    loadBookingsAndJourney().finally(() => setLoading(false));

    // Real-time seat map via onSnapshot
    const unsub = listenSeatMap(journeyId, (sm) => {
      setSeatMap(sm);
      if (sm) {
        const seats = Object.values(sm.seats ?? {});
        setCounts({
          total: seats.length,
          booked: seats.filter((s) => s.status === 'booked').length,
          held: seats.filter((s) => s.status === 'held').length,
          available: seats.filter((s) => s.status === 'available').length,
        });
      }
    });

    return () => unsub();
  }, [journeyId, loadBookingsAndJourney]);

  // Called by AdminSeatMap after any write so bookings list stays fresh
  function handleRefresh() {
    loadBookingsAndJourney();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-teal-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Seat Map —{' '}
            {journey ? `${journey.origin} → ${journey.destination}` : 'Loading…'}
          </h1>
          {journey && (
            <p className="text-sm text-slate-500 mt-0.5">
              {journey.departureDate} · {journey.departureTime} · {journey.operatorName}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="ml-auto p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-teal-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Seats', value: counts.total, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: 'Booked', value: counts.booked, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: 'Held', value: counts.held, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Available', value: counts.available, color: 'text-teal-700 bg-teal-50 border-teal-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-2xl font-bold mt-1">{loading ? '…' : value}</p>
          </div>
        ))}
      </div>

      {/* Seat map — each column renders its own card inside AdminSeatMap */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : seatMap && journey ? (
        <AdminSeatMap
          seatMap={seatMap}
          bookings={bookings}
          journey={journey}
          journeyId={journeyId}
          onRefresh={handleRefresh}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-400 text-center py-8">
            No seat map available for this journey.
          </p>
        </div>
      )}
    </div>
  );
}
