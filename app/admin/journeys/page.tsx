"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Edit2, XCircle, ChevronLeft, ChevronRight, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { getAllJourneys, cancelJourney, getSeatCounts, fmtFCFA, fmtDate } from '../../../lib/adminFirestore';
import JourneyFormModal from '../../../components/admin/JourneyFormModal';
import type { Journey } from '../../../lib/firestore';

const PAGE_SIZE = 20;

type JourneyRow = Journey & {
  bookedSeats?: number;
  availableSeats?: number;
  heldSeats?: number;
};

function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  const cls = map[value?.toLowerCase()] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {value ?? '—'}
    </span>
  );
}

const statusMap: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [formTarget, setFormTarget] = useState<Journey | null | undefined>(undefined); // undefined = closed
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getAllJourneys();
      // Enrich with seat counts (batched)
      const enriched: JourneyRow[] = await Promise.all(
        rows.map(async (j) => {
          try {
            const counts = await getSeatCounts(j.id!);
            return { ...j, bookedSeats: counts.booked + counts.held, availableSeats: counts.available, heldSeats: counts.held };
          } catch {
            return { ...j };
          }
        })
      );
      setJourneys(enriched);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load journeys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this journey? This cannot be undone.')) return;
    setCancelling(id);
    try {
      await cancelJourney(id);
      setJourneys((prev) => prev.map((j) => j.id === id ? { ...j, status: 'cancelled' } : j));
    } catch (e: any) {
      alert(e.message ?? 'Failed to cancel journey');
    } finally {
      setCancelling(null);
    }
  }

  const totalPages = Math.ceil(journeys.length / PAGE_SIZE);
  const pageRows = journeys.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Journeys</h1>
          <p className="text-sm text-slate-500 mt-0.5">{journeys.length} total journeys</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:border-teal-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setFormTarget(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Journey
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Route', 'Date', 'Depart', 'Arrive', 'Operator',
                  'Bus Code', 'Plate', 'Driver', 'Motor Boy',
                  'Type', 'Class', 'Price', 'Total', 'Booked', 'Avail', 'Status', 'Actions'
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
                  <tr key={i}>
                    {Array.from({ length: 17 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-sm text-slate-400">
                    No journeys found. Create one to get started.
                  </td>
                </tr>
              ) : (
                pageRows.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {j.origin} → {j.destination}
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate(j.departureDate)}</td>
                    <td className="px-3 py-3 text-slate-600">{j.departureTime}</td>
                    <td className="px-3 py-3 text-slate-600">{j.estimatedArrivalTime}</td>
                    <td className="px-3 py-3 text-slate-700 truncate max-w-[100px]">{j.operatorName}</td>
                    <td className="px-3 py-3 font-mono text-slate-600">{j.busCode}</td>
                    <td className="px-3 py-3 text-slate-600">{j.busPlate ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600 truncate max-w-[90px]">{j.driverName ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600 truncate max-w-[90px]">{j.motorBoyName ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{j.busType}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${j.journeyClass === 'VIP' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {j.journeyClass}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-semibold whitespace-nowrap">{fmtFCFA(j.pricePerSeat)}</td>
                    <td className="px-3 py-3 text-center text-slate-700">{j.totalSeats}</td>
                    <td className="px-3 py-3 text-center text-slate-700">{j.bookedSeats ?? '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/admin/journeys/${j.id}/seats`}
                        className="text-teal-600 font-semibold hover:underline"
                      >
                        {j.availableSeats ?? '—'}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge value={j.status} map={statusMap} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setFormTarget(j)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        {j.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(j.id!)}
                            disabled={cancelling === j.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" />
                            {cancelling === j.id ? '…' : 'Cancel'}
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
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, journeys.length)} of {journeys.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                    i === page ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-teal-300 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Journey Form Modal */}
      {formTarget !== undefined && (
        <JourneyFormModal
          journey={formTarget}
          onClose={() => setFormTarget(undefined)}
          onSaved={() => { setFormTarget(undefined); load(); }}
        />
      )}
    </div>
  );
}
