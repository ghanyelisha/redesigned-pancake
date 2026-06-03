"use client";
import { useState, useEffect, useRef } from 'react';
import {
  X, User, Package, Unlock, Lock, Search, Download, Send,
  ChevronDown, AlertTriangle, Navigation2, MessageSquare,
  CheckSquare, Square,
} from 'lucide-react';
import type { Booking, SeatMap, Journey, Seat, SeatStatus } from '../../lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../lib/firebase';
import {
  releaseSeatAdmin,
  changeSeatAdmin,
  blockSeatAdmin,
  unblockSeatAdmin,
  cancelBookingFromSeat,
  forceConfirmBySeat,
  bulkReleaseHolds,
  markJourneyDeparted,
  createSmsBroadcast,
} from '../../lib/adminFirestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Toast = { id: string; message: string; type: 'success' | 'error' };

type SeatRow = Seat & { num: string };

type Props = {
  seatMap: SeatMap;
  bookings: Record<string, Booking>;
  journey: Journey;
  journeyId: string;
  onRefresh: () => void;
};

// ─── Toast list ───────────────────────────────────────────────────────────────

function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border transition-all ${
            t.type === 'success'
              ? 'bg-teal-700 text-white border-teal-600'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {t.type === 'success' ? (
            <CheckSquare className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {t.message}
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Hold urgency helpers ─────────────────────────────────────────────────────

function holdUrgency(
  heldUntil: Timestamp | null | undefined
): 'normal' | 'warning' | 'critical' {
  if (!heldUntil) return 'critical';
  const rem = heldUntil.toMillis() - Date.now();
  if (rem <= 60_000) return 'critical';
  if (rem <= 300_000) return 'warning';
  return 'normal';
}

function fmtCountdown(heldUntil: Timestamp | null | undefined, now: number): string {
  if (!heldUntil) return 'Expired';
  const rem = heldUntil.toMillis() - now;
  if (rem <= 0) return 'Expired';
  const m = Math.floor(rem / 60_000);
  const s = Math.floor((rem % 60_000) / 1_000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// ─── Single seat button ───────────────────────────────────────────────────────

function SeatBtn({
  seat,
  isActive,
  isReassignTarget,
  isCheckable,
  isChecked,
  isSearchMatch,
  isSearchDimmed,
  tick,
  onCheck,
  onClick,
}: {
  seat: SeatRow;
  isActive: boolean;
  isReassignTarget: boolean;
  isCheckable: boolean;
  isChecked: boolean;
  isSearchMatch: boolean;
  isSearchDimmed: boolean;
  tick: number; // triggers re-render for urgency
  onCheck?: (checked: boolean) => void;
  onClick: () => void;
}) {
  const urg = seat.status === 'held' ? holdUrgency(seat.heldUntil) : 'normal';

  // ── border + background ──
  let cls = '';
  if (isReassignTarget) {
    cls = 'bg-emerald-50 border-2 border-emerald-400 animate-pulse ring-2 ring-emerald-200';
  } else if (isActive) {
    cls = `ring-2 ring-teal-500 border-teal-400 ${
      seat.status === 'booked' ? 'bg-slate-100' : 'bg-teal-50'
    }`;
  } else if (isSearchMatch) {
    cls = 'ring-2 ring-cyan-400 border-cyan-300 bg-cyan-50';
  } else {
    switch (seat.status as SeatStatus) {
      case 'available':
        cls = 'bg-white border-slate-200 hover:border-teal-400';
        break;
      case 'held':
        cls =
          urg === 'critical'
            ? 'bg-red-50 border-red-400 animate-pulse'
            : urg === 'warning'
            ? 'bg-orange-50 border-orange-400'
            : 'bg-amber-50 border-amber-300';
        break;
      case 'booked':
        cls = 'bg-slate-100 border-slate-400';
        break;
      case 'blocked':
        cls = 'bg-slate-800 border-slate-700';
        break;
      case 'locked':
        cls = 'bg-slate-500 border-slate-400';
        break;
    }
  }

  const seatColor =
    seat.status === 'booked'
      ? '#374151'
      : seat.status === 'held'
      ? urg === 'critical'
        ? '#dc2626'
        : urg === 'warning'
        ? '#f97316'
        : '#d97706'
      : seat.status === 'blocked' || seat.status === 'locked'
      ? '#e2e8f0'
      : '#0f766e';

  const labelColor =
    seat.status === 'blocked' || seat.status === 'locked'
      ? 'text-white'
      : seat.status === 'booked'
      ? 'text-slate-600'
      : seat.status === 'held'
      ? urg === 'critical'
        ? 'text-red-700'
        : urg === 'warning'
        ? 'text-orange-700'
        : 'text-amber-700'
      : 'text-teal-700';

  return (
    <div className={`relative ${isSearchDimmed ? 'opacity-40' : 'opacity-100'}`}>
      {isCheckable && (
        <div
          className="absolute -top-1 -right-1 z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onCheck?.(!isChecked);
          }}
        >
          {isChecked ? (
            <CheckSquare className="h-4 w-4 text-teal-700 bg-white rounded shadow" />
          ) : (
            <Square className="h-4 w-4 text-slate-400 bg-white rounded shadow" />
          )}
        </div>
      )}
      <button
        onClick={onClick}
        title={`Seat ${seat.num} — ${seat.status}`}
        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all ${cls}`}
      >
        {seat.status === 'blocked' ? (
          <Lock className="h-5 w-5 text-white" />
        ) : seat.status === 'locked' ? (
          <Lock className="h-5 w-5 text-slate-300" />
        ) : (
          <svg width="26" height="22" viewBox="0 0 28 24" fill="none">
            <rect x="4" y="1" width="20" height="11" rx="3" fill={seatColor} opacity="0.9" />
            <rect x="2" y="12" width="24" height="7" rx="2" fill={seatColor} opacity="0.75" />
            <rect x="1" y="10" width="4" height="10" rx="2" fill={seatColor} opacity="0.6" />
            <rect x="23" y="10" width="4" height="10" rx="2" fill={seatColor} opacity="0.6" />
          </svg>
        )}
        <span className={`text-[9px] font-bold leading-none ${labelColor}`}>{seat.num}</span>
      </button>
    </div>
  );
}

// ─── Spinner helper ───────────────────────────────────────────────────────────

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`w-3.5 h-3.5 border-2 ${light ? 'border-white border-t-transparent' : 'border-teal-700 border-t-transparent'} rounded-full animate-spin shrink-0`}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminSeatMap({
  seatMap,
  bookings,
  journey,
  journeyId,
  onRefresh,
}: Props) {
  // ── Core derived data ──────────────────────────────────────────────────────
  const rawSeats = seatMap?.seats ?? {};
  const seatNums = Object.keys(rawSeats).sort((a, b) => Number(a) - Number(b));
  const allSeats: SeatRow[] = seatNums.map((num) => ({ num, ...(rawSeats[num] as Seat) }));
  const heldNums = seatNums.filter((n) => rawSeats[n]?.status === 'held');
  const confirmedCount = Object.values(bookings).filter(
    (b) => b.paymentStatus === 'confirmed'
  ).length;
  const isDeparted = (journey as any)?.status === 'departed';
  const adminUid = auth.currentUser?.uid ?? 'admin';

  // Grid: rows of 4 (2 + aisle + 2)
  const gridRows: SeatRow[][] = [];
  for (let i = 0; i < allSeats.length; i += 4) gridRows.push(allSeats.slice(i, i + 4));

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeSeat, setActiveSeat] = useState<string | null>(null);
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
  const [selectHeldMode, setSelectHeldMode] = useState(false);
  const [selectedHeld, setSelectedHeld] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDepartedModal, setShowDepartedModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  // Right panel sub-states
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showBlockOptions, setShowBlockOptions] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [forceConfirmError, setForceConfirmError] = useState('');
  // Timers
  const [tick, setTick] = useState(0); // 30 s — hold urgency re-color
  const [countdownNow, setCountdownNow] = useState(Date.now()); // 1 s — active held countdown

  const exportMenuRef = useRef<HTMLDivElement>(null);

  // ── Timers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeSeat && rawSeats[activeSeat]?.status === 'held') {
      const t = setInterval(() => setCountdownNow(Date.now()), 1_000);
      return () => clearInterval(t);
    }
  }, [activeSeat, rawSeats]);

  // ── Click-outside export menu ──────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Reset panel sub-states when seat changes ───────────────────────────────
  useEffect(() => {
    setCancelConfirm(false);
    setShowBlockOptions(false);
    setBlockReason('');
    setForceConfirmError('');
  }, [activeSeat]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const matchingSeats: Set<string> | null = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    Object.entries(bookings).forEach(([seat, b]) => {
      const hay = [b.passengerName, b.passengerSurname, b.bookingReference]
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) set.add(seat);
    });
    return set;
  })();
  const noMatchFound = matchingSeats !== null && matchingSeats.size === 0;

  // ── Toast helpers ──────────────────────────────────────────────────────────
  function addToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4_000);
  }

  async function runAction(key: string, fn: () => Promise<void>) {
    setLoadingAction(key);
    try {
      await fn();
    } catch (e: any) {
      addToast(e.message ?? 'Action failed', 'error');
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  async function handleRelease(seatNum: string) {
    await runAction('release', async () => {
      await releaseSeatAdmin(journeyId, seatNum);
      if (activeSeat === seatNum) setActiveSeat(null);
      onRefresh();
      addToast(`Seat ${seatNum} hold released`);
    });
  }

  async function handleBulkRelease() {
    const nums = Array.from(selectedHeld);
    await runAction('bulk-release', async () => {
      await bulkReleaseHolds(journeyId, nums);
      setSelectedHeld(new Set());
      setSelectHeldMode(false);
      onRefresh();
      addToast(`${nums.length} hold${nums.length > 1 ? 's' : ''} released`);
    });
  }

  async function handleChangeSeat(booking: Booking, newSeat: string) {
    await runAction('change-seat', async () => {
      await changeSeatAdmin(booking.id!, journeyId, booking.seatNumber, newSeat);
      setReassignBooking(null);
      setActiveSeat(newSeat);
      onRefresh();
      addToast(`Seat changed to ${newSeat} for ${booking.passengerName}`);
    });
  }

  async function handleCancelBooking(booking: Booking) {
    await runAction('cancel', async () => {
      await cancelBookingFromSeat(journeyId, booking.id!, booking.seatNumber);
      setActiveSeat(null);
      onRefresh();
      addToast('Booking cancelled and seat released');
    });
  }

  async function handleForceConfirm(seatNum: string) {
    const booking = bookings[seatNum];
    if (!booking || booking.paymentStatus !== 'pending') {
      setForceConfirmError('No pending booking found for this seat.');
      return;
    }
    setForceConfirmError('');
    await runAction('force-confirm', async () => {
      await forceConfirmBySeat(journeyId, booking.id!, seatNum);
      onRefresh();
      addToast('Booking confirmed');
    });
  }

  async function handleBlock(seatNum: string, reason: string) {
    await runAction('block', async () => {
      await blockSeatAdmin(journeyId, seatNum, reason, adminUid);
      setShowBlockOptions(false);
      setBlockReason('');
      onRefresh();
      addToast(`Seat ${seatNum} blocked — ${reason}`);
    });
  }

  async function handleUnblock(seatNum: string) {
    await runAction('unblock', async () => {
      await unblockSeatAdmin(journeyId, seatNum);
      setActiveSeat(null);
      onRefresh();
      addToast(`Seat ${seatNum} unblocked`);
    });
  }

  async function handleMarkDeparted() {
    await runAction('depart', async () => {
      await markJourneyDeparted(journeyId);
      setShowDepartedModal(false);
      onRefresh();
      addToast('Journey marked as departed');
    });
  }

  async function handleSendSms() {
    const phones = Object.values(bookings)
      .filter((b) => b.paymentStatus === 'confirmed')
      .map((b) => b.passengerPhone)
      .filter(Boolean);
    await runAction('sms', async () => {
      await createSmsBroadcast({
        journeyId,
        message: smsMessage,
        sentBy: adminUid,
        recipientCount: phones.length,
        recipients: phones,
      });
      setShowSmsModal(false);
      setSmsMessage('');
      addToast(`Broadcast queued for ${phones.length} passengers`);
    });
  }

  function handleSeatClick(num: string) {
    // In reassign mode, only available seats trigger a change
    if (reassignBooking) {
      if (rawSeats[num]?.status === 'available') {
        handleChangeSeat(reassignBooking, num);
      }
      return;
    }
    // In departed mode only booked seats are interactive
    if (isDeparted && rawSeats[num]?.status !== 'booked') return;
    setActiveSeat(activeSeat === num ? null : num);
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const header =
      'Seat Number,Passenger Name,Passenger Surname,Phone Number,ID Type,ID Number,Luggage Size,Luggage Types,Booking Reference,Payment Status,Amount FCFA';
    const rows = seatNums
      .filter((n) => rawSeats[n]?.status === 'booked')
      .map((n) => {
        const b = bookings[n];
        if (!b) return null;
        return [
          n,
          b.passengerName ?? '',
          b.passengerSurname ?? '',
          b.passengerPhone ?? '',
          b.idType ?? '',
          b.idNumber ?? '',
          b.luggageSize ?? '',
          (b.luggageTypes ?? []).join(' | '),
          b.bookingReference ?? '',
          b.paymentStatus ?? '',
          b.totalAmount ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
      .filter(Boolean);

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyBus-Manifest-${journeyId}-${(journey as any)?.departureDate ?? 'unknown'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    addToast('CSV downloaded');
  }

  function exportPDF() {
    setShowExportMenu(false);
    window.print();
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const activeSeatData = activeSeat ? (rawSeats[activeSeat] as Seat) : null;
  const activeBooking = activeSeat ? bookings[activeSeat] : null;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── Toasts ── */}
      <ToastList
        toasts={toasts}
        onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />

      {/* ── Print-only manifest ── */}
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #mybus-print-manifest, #mybus-print-manifest * { visibility: visible; }
          #mybus-print-manifest { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <div id="mybus-print-manifest" className="hidden print:block p-8">
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MyBus</h1>
            <p className="text-sm text-slate-500">Passenger Manifest</p>
          </div>
          <div className="text-right text-sm text-slate-700 space-y-0.5">
            <p>
              <strong>Route:</strong> {(journey as any)?.origin} → {(journey as any)?.destination}
            </p>
            <p>
              <strong>Date:</strong> {(journey as any)?.departureDate} ·{' '}
              {(journey as any)?.departureTime}
            </p>
            <p>
              <strong>Driver:</strong> {(journey as any)?.driverName ?? '—'} ·{' '}
              <strong>Plate:</strong> {(journey as any)?.busPlate ?? '—'}
            </p>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {[
                'Seat','Name','Surname','Phone','ID Type','ID #',
                'Luggage','Types','Ref','Status','FCFA',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seatNums
              .filter((n) => rawSeats[n]?.status === 'booked')
              .map((n) => {
                const b = bookings[n];
                if (!b) return null;
                return (
                  <tr key={n}>
                    {[
                      n,
                      b.passengerName,
                      b.passengerSurname,
                      b.passengerPhone,
                      b.idType,
                      b.idNumber,
                      b.luggageSize,
                      (b.luggageTypes ?? []).join(', '),
                      b.bookingReference,
                      b.paymentStatus,
                      b.totalAmount,
                    ].map((v, i) => (
                      <td
                        key={i}
                        style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}
                      >
                        {v ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── Departed banner ── */}
      {isDeparted && (
        <div className="mb-4 flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-semibold text-sm print:hidden">
          <Navigation2 className="h-4 w-4" />
          Journey has DEPARTED — seat map is read-only
        </div>
      )}

      {/* ── Reassign mode banner ── */}
      {reassignBooking && (
        <div className="mb-4 flex items-center justify-between bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold print:hidden">
          <span>
            Select a new seat for {reassignBooking.passengerName}{' '}
            {reassignBooking.passengerSurname}
          </span>
          <button
            onClick={() => { setReassignBooking(null); setActiveSeat(null); }}
            className="text-xs underline hover:no-underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
        {/* Select held checkbox */}
        {!isDeparted && heldNums.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectHeldMode}
              onChange={(e) => {
                setSelectHeldMode(e.target.checked);
                if (!e.target.checked) {
                  setSelectedHeld(new Set());
                } else {
                  setSelectedHeld(new Set(heldNums));
                }
              }}
              className="accent-teal-700"
            />
            Select held seats
          </label>
        )}

        {/* Bulk release */}
        {selectedHeld.size > 0 && (
          <button
            onClick={handleBulkRelease}
            disabled={loadingAction === 'bulk-release'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
          >
            {loadingAction === 'bulk-release' && <Spinner light />}
            Release {selectedHeld.size} hold{selectedHeld.size > 1 ? 's' : ''}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-30 min-w-[150px] overflow-hidden">
                <button
                  onClick={exportCSV}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  Export PDF (Print)
                </button>
              </div>
            )}
          </div>

          {/* Notify passengers */}
          <button
            onClick={() => setShowSmsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-teal-300 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Notify Passengers
          </button>

          {/* Mark as Departed */}
          {!isDeparted && (
            <button
              onClick={() => setShowDepartedModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              <Navigation2 className="h-3.5 w-3.5" />
              Mark as Departed
            </button>
          )}
        </div>
      </div>

      {/* ── Main 2-column layout: seat map (left) + detail panel (right) ── */}
      <div className="flex gap-5 items-start print:hidden">
        {/* ── LEFT: own white card ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by passenger name or booking reference"
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {noMatchFound && (
            <p className="text-xs text-slate-400 mb-2 pl-1">No matching passenger found.</p>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300" />
              Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />
              Held
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
              Held &lt;5m
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
              Held &lt;1m
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
              Booked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
              Blocked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
              Locked
            </span>
          </div>

          {/* Bus front label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚌</span>
            <span className="text-[10px] text-slate-400 font-medium">Front</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Seat grid: 2 + aisle + 2 */}
          <div className="inline-flex flex-col gap-1.5 overflow-x-auto max-w-full">
            {gridRows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1">
                {row.slice(0, 2).map((s) => (
                  <SeatBtn
                    key={s.num}
                    seat={s}
                    isActive={activeSeat === s.num}
                    isReassignTarget={!!reassignBooking && s.status === 'available'}
                    isCheckable={selectHeldMode && s.status === 'held'}
                    isChecked={selectedHeld.has(s.num)}
                    isSearchMatch={matchingSeats?.has(s.num) ?? false}
                    isSearchDimmed={
                      matchingSeats !== null &&
                      !matchingSeats.has(s.num) &&
                      s.status === 'booked'
                    }
                    tick={tick}
                    onCheck={(checked) => {
                      const next = new Set(selectedHeld);
                      if (checked) next.add(s.num);
                      else next.delete(s.num);
                      setSelectedHeld(next);
                    }}
                    onClick={() => handleSeatClick(s.num)}
                  />
                ))}
                {/* Aisle */}
                <div className="w-4 shrink-0" />
                {row.slice(2, 4).map((s) => (
                  <SeatBtn
                    key={s.num}
                    seat={s}
                    isActive={activeSeat === s.num}
                    isReassignTarget={!!reassignBooking && s.status === 'available'}
                    isCheckable={selectHeldMode && s.status === 'held'}
                    isChecked={selectedHeld.has(s.num)}
                    isSearchMatch={matchingSeats?.has(s.num) ?? false}
                    isSearchDimmed={
                      matchingSeats !== null &&
                      !matchingSeats.has(s.num) &&
                      s.status === 'booked'
                    }
                    tick={tick}
                    onCheck={(checked) => {
                      const next = new Set(selectedHeld);
                      if (checked) next.add(s.num);
                      else next.delete(s.num);
                      setSelectedHeld(next);
                    }}
                    onClick={() => handleSeatClick(s.num)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: own white card ── */}
        <div className="w-72 shrink-0 sticky top-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[180px]">
            {!activeSeat ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-400 gap-2 p-4 text-center">
                <User className="h-8 w-8 opacity-25" />
                <p className="text-xs">Click a seat to view details</p>
              </div>
            ) : (
              <>
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
                  <span className="text-sm font-semibold text-slate-800">
                    Seat {activeSeat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        activeSeatData?.status === 'booked'
                          ? 'bg-slate-200 text-slate-700'
                          : activeSeatData?.status === 'held'
                          ? 'bg-amber-100 text-amber-700'
                          : activeSeatData?.status === 'blocked'
                          ? 'bg-red-100 text-red-700'
                          : activeSeatData?.status === 'locked'
                          ? 'bg-slate-300 text-slate-600'
                          : 'bg-teal-100 text-teal-700'
                      }`}
                    >
                      {activeSeatData?.status}
                    </span>
                    <button
                      onClick={() => setActiveSeat(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* ── AVAILABLE ── */}
                  {activeSeatData?.status === 'available' && (
                    <>
                      <p className="text-xs text-slate-500">This seat is available.</p>
                      {!showBlockOptions ? (
                        <button
                          onClick={() => setShowBlockOptions(true)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Block Seat
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">Select reason:</p>
                          <select
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-500 bg-white"
                          >
                            <option value="">— Choose reason —</option>
                            <option value="Broken seat">Broken seat</option>
                            <option value="VIP reservation">VIP reservation</option>
                            <option value="Operational hold">Operational hold</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowBlockOptions(false);
                                setBlockReason('');
                              }}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={!blockReason || loadingAction === 'block'}
                              onClick={() => handleBlock(activeSeat!, blockReason)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              {loadingAction === 'block' && <Spinner light />}
                              Block
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── HELD ── */}
                  {activeSeatData?.status === 'held' && (
                    <>
                      {/* Countdown */}
                      <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-xs text-slate-500">Hold expires in</span>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            holdUrgency(activeSeatData?.heldUntil) === 'critical'
                              ? 'text-red-600'
                              : holdUrgency(activeSeatData?.heldUntil) === 'warning'
                              ? 'text-orange-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {fmtCountdown(activeSeatData?.heldUntil, countdownNow)}
                        </span>
                      </div>

                      {/* Booking info */}
                      {activeBooking && (
                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1 text-xs text-slate-700">
                          <p className="font-semibold">
                            {activeBooking.passengerName} {activeBooking.passengerSurname}
                          </p>
                          <p className="text-slate-500">
                            Ref:{' '}
                            <span className="font-mono text-slate-700">
                              {activeBooking.bookingReference}
                            </span>
                          </p>
                          <p className="text-slate-500">
                            Phone: {activeBooking.passengerPhone}
                          </p>
                          <p className="text-slate-500">
                            Status:{' '}
                            <span
                              className={`font-semibold ${
                                activeBooking.paymentStatus === 'pending'
                                  ? 'text-amber-600'
                                  : 'text-teal-600'
                              }`}
                            >
                              {activeBooking.paymentStatus}
                            </span>
                          </p>
                        </div>
                      )}

                      {forceConfirmError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {forceConfirmError}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRelease(activeSeat!)}
                          disabled={loadingAction === 'release'}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                        >
                          {loadingAction === 'release' ? (
                            <Spinner />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                          Release
                        </button>
                        <button
                          onClick={() => handleForceConfirm(activeSeat!)}
                          disabled={loadingAction === 'force-confirm'}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50"
                        >
                          {loadingAction === 'force-confirm' && <Spinner light />}
                          Force Confirm
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── BOOKED ── */}
                  {activeSeatData?.status === 'booked' && activeBooking && (
                    <>
                      <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900">
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                          {activeBooking.passengerName} {activeBooking.passengerSurname}
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-600">
                          <span className="font-medium text-slate-700">Phone</span>
                          <span>{activeBooking.passengerPhone}</span>
                          <span className="font-medium text-slate-700">ID Type</span>
                          <span>{activeBooking.idType ?? '—'}</span>
                          <span className="font-medium text-slate-700">ID No.</span>
                          <span>{activeBooking.idNumber ?? '—'}</span>
                          {activeBooking.luggageSize &&
                            activeBooking.luggageSize !== 'No luggage' && (
                              <>
                                <span className="font-medium text-slate-700">Luggage</span>
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3 text-slate-400" />
                                  {activeBooking.luggageSize}
                                </span>
                              </>
                            )}
                          {(activeBooking.luggageTypes?.length ?? 0) > 0 && (
                            <>
                              <span className="font-medium text-slate-700">Types</span>
                              <span>{activeBooking.luggageTypes!.join(', ')}</span>
                            </>
                          )}
                          <span className="font-medium text-slate-700">Ref</span>
                          <span className="font-mono text-[10px] break-all">
                            {activeBooking.bookingReference}
                          </span>
                          <span className="font-medium text-slate-700">Status</span>
                          <span
                            className={`font-semibold capitalize ${
                              activeBooking.paymentStatus === 'confirmed'
                                ? 'text-teal-600'
                                : activeBooking.paymentStatus === 'cancelled'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {activeBooking.paymentStatus}
                          </span>
                          <span className="font-medium text-slate-700">Amount</span>
                          <span>FCFA {activeBooking.totalAmount?.toLocaleString()}</span>
                        </div>
                      </div>

                      {!cancelConfirm ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setReassignBooking(activeBooking);
                              setActiveSeat(null);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors"
                          >
                            Change Seat
                          </button>
                          <button
                            onClick={() => setCancelConfirm(true)}
                            className="flex-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                          <p className="text-xs text-red-700 font-semibold">
                            Cancel this booking? This cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCancelConfirm(false)}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => handleCancelBooking(activeBooking)}
                              disabled={loadingAction === 'cancel'}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
                            >
                              {loadingAction === 'cancel' && <Spinner light />}
                              Confirm
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Booked but no booking record */}
                  {activeSeatData?.status === 'booked' && !activeBooking && (
                    <p className="text-xs text-slate-400">
                      No booking record found for this seat.
                    </p>
                  )}

                  {/* ── BLOCKED ── */}
                  {activeSeatData?.status === 'blocked' && (
                    <>
                      <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5 text-xs text-slate-700">
                        <p className="font-semibold text-slate-900">Seat Blocked</p>
                        <p className="text-slate-500">
                          Reason:{' '}
                          <span className="font-semibold text-slate-700">
                            {activeSeatData?.blockReason ?? '—'}
                          </span>
                        </p>
                        <p className="text-slate-500">
                          Blocked by: {activeSeatData?.blockedBy ?? '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnblock(activeSeat!)}
                        disabled={loadingAction === 'unblock'}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {loadingAction === 'unblock' ? (
                          <Spinner light />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                        Release Block
                      </button>
                    </>
                  )}

                  {/* ── LOCKED ── */}
                  {activeSeatData?.status === 'locked' && (
                    <p className="text-xs text-slate-500">
                      Seat locked — journey has departed.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mark as Departed modal ── */}
      {showDepartedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDepartedModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              Mark as Departed?
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Mark this journey as departed? All remaining available and held seats will be
              locked and no new bookings will be accepted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDepartedModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDeparted}
                disabled={loadingAction === 'depart'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60"
              >
                {loadingAction === 'depart' && <Spinner light />}
                Confirm Departure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMS broadcast modal ── */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSmsModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Notify Passengers
              </h3>
              <button
                onClick={() => setShowSmsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Message to all booked passengers
                </label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value.slice(0, 160))}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none placeholder:text-slate-400"
                  placeholder="Type your message…"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>
                    {confirmedCount} passenger{confirmedCount !== 1 ? 's' : ''} will
                    receive this
                  </span>
                  <span
                    className={smsMessage.length > 140 ? 'text-amber-500 font-semibold' : ''}
                  >
                    {160 - smsMessage.length} chars remaining
                  </span>
                </div>
              </div>
              <button
                onClick={handleSendSms}
                disabled={
                  !smsMessage.trim() ||
                  confirmedCount === 0 ||
                  loadingAction === 'sms'
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                {loadingAction === 'sms' && <Spinner light />}
                <Send className="h-4 w-4" />
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
