"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import {
  releaseSeatAdmin,
  getBookingsForJourney,
  changeSeatAdmin,
  getSeatCounts,
} from '../../../../../lib/adminFirestore';
import { fetchSeatMap, getJourneyById } from '../../../../../lib/firestore';
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
  // Change-seat state: which booking is being moved
  const [changingBooking, setChangingBooking] = useState<Booking | null>(null);
  const [changingSeat, setChangingSeat] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [j, sm, bks, cts] = await Promise.all([
        getJourneyById(journeyId),
        fetchSeatMap(journeyId),
        getBookingsForJourney(journeyId),
        getSeatCounts(journeyId),
      ]);
      setJourney(j);
      setSeatMap(sm);
      setBookings(bks);
      setCounts(cts);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load seat data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [journeyId]);

  async function handleRelease(seatNum: string) {
    try {
      await releaseSeatAdmin(journeyId, seatNum);
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Failed to release seat');
    }
  }

  async function handleChangeSeat(booking: Booking, newSeat: string) {
    setChangingSeat(true);
    try {
      await changeSeatAdmin(booking.id!, journeyId, booking.seatNumber, newSeat);
      setChangingBooking(null);
      await load();
    } catch (e: any) {
      alert(e.message ?? 'Failed to change seat');
    } finally {
      setChangingSeat(false);
    }
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
            Seat Map — {journey ? `${journey.origin} → ${journey.destination}` : 'Loading…'}
          </h1>
          {journey && (
            <p className="text-sm text-slate-500 mt-0.5">
              {journey.departureDate} · {journey.departureTime} · {journey.operatorName}
            </p>
          )}
        </div>
        <button
          onClick={load}
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

      {/* Summary cards */}
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

      {/* Seat map */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : seatMap ? (
          <AdminSeatMap
            seatMap={seatMap}
            bookings={bookings}
            onRelease={handleRelease}
            onChangeSeat={(b) => setChangingBooking(b)}
          />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">No seat map available for this journey.</p>
        )}
      </div>

      {/* Change Seat Modal */}
      {changingBooking && seatMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChangingBooking(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Change Seat — {changingBooking.passengerName} {changingBooking.passengerSurname}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Current seat: <strong>{changingBooking.seatNumber}</strong>. Click an available seat to reassign.
            </p>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-96">
              {Object.entries(seatMap.seats)
                .filter(([, s]) => s.status === 'available')
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([num]) => (
                  <button
                    key={num}
                    disabled={changingSeat}
                    onClick={() => handleChangeSeat(changingBooking, num)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-sm font-medium text-teal-800 hover:bg-teal-100 transition-colors disabled:opacity-50"
                  >
                    <span>Seat {num}</span>
                    <span className="text-xs text-teal-600">Available → assign</span>
                  </button>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setChangingBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
