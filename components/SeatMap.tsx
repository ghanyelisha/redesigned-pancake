"use client";
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { listenSeatMap, fetchSeatMap, holdSeatTransaction } from '../lib/firestore';
import type { SeatMap as SeatMapType, Seat } from '../lib/firestore';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function SteeringWheel() {
  return (
    <svg width="40" height="40" viewBox="0 0 44 44" fill="none" aria-label="Driver">
      <circle cx="22" cy="22" r="19" stroke="#1e293b" strokeWidth="4" fill="none" />
      <circle cx="22" cy="22" r="5" fill="#1e293b" />
      <line x1="22" y1="17" x2="22" y2="6" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="22" y1="27" x2="14" y2="36" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="22" y1="27" x2="30" y2="36" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M4 18 Q2 22 5 25 Q7 27 10 24 Q13 21 11 17 Q9 13 6 15 Z" fill="#475569" />
      <path d="M40 18 Q42 22 39 25 Q37 27 34 24 Q31 21 33 17 Q35 13 38 15 Z" fill="#475569" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg width="52" height="44" viewBox="0 0 52 44" fill="none" aria-label="Door">
      <rect x="1" y="1" width="50" height="42" rx="3" stroke="#94a3b8" strokeWidth="2" fill="#f1f5f9" />
      <rect x="4" y="4" width="20" height="36" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="28" y="4" width="20" height="36" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="22" cy="22" r="2.5" fill="#94a3b8" />
      <circle cx="30" cy="22" r="2.5" fill="#94a3b8" />
    </svg>
  );
}

// ─── Hold urgency ─────────────────────────────────────────────────────────────

type HoldUrgency = 'normal' | 'warning' | 'critical';

function heldUrgency(heldUntil: Timestamp | null | undefined): HoldUrgency {
  if (!heldUntil) return 'critical';
  const rem = heldUntil.toMillis() - Date.now();
  if (rem <= 60_000) return 'critical';   // < 1 min
  if (rem <= 300_000) return 'warning';   // < 5 min
  return 'normal';
}

// ─── Seat shape ───────────────────────────────────────────────────────────────

type SeatStatus = 'available' | 'booked' | 'held' | 'selected';

function SeatBtn({
  num,
  status,
  heldUntil,
  onClick,
}: {
  num: string;
  status: SeatStatus;
  heldUntil?: Timestamp | null;
  onClick?: () => void;
}) {
  const isBooked = status === 'booked';
  const isHeld   = status === 'held';
  const isSel    = status === 'selected';

  const urg: HoldUrgency = isHeld ? heldUrgency(heldUntil) : 'normal';

  // Fill colour
  // Available = navy blue, Booked/Held (other user) = red, Selected = yellow
  const fill = isSel
    ? '#ca8a04'   // yellow / amber — current user's selection
    : isBooked
    ? '#dc2626'   // red — sold
    : isHeld
    ? '#dc2626'   // red — held by another user
    : '#1e3a8a';  // navy blue — available

  // Label colour
  const labelColor = isSel
    ? '#78350f'
    : isBooked
    ? '#991b1b'
    : isHeld
    ? '#991b1b'
    : '#1e3a8a';

  // Wrapper ring/animation for held urgency
  const wrapCls = isHeld
    ? urg === 'critical'
      ? 'animate-pulse ring-2 ring-red-400 ring-offset-1 rounded'
      : urg === 'warning'
      ? 'ring-2 ring-orange-400 ring-offset-1 rounded'
      : ''
    : isSel
    ? 'ring-2 ring-teal-400 ring-offset-1 rounded'
    : '';

  return (
    <button
      onClick={isBooked ? undefined : onClick}
      disabled={isBooked}
      title={`Seat ${num} — ${status}`}
      className={`flex flex-col items-center gap-0.5 rounded transition-all active:scale-95 ${
        isBooked ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${wrapCls}`}
      style={{ opacity: isBooked ? 0.45 : 1 }}
    >
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <rect x="3" y="0" width="28" height="14" rx="5" fill={fill} />
        <rect x="1" y="13" width="32" height="9" rx="3" fill={fill} opacity="0.82" />
        <rect x="0" y="11" width="4" height="13" rx="2" fill={fill} opacity="0.65" />
        <rect x="30" y="11" width="4" height="13" rx="2" fill={fill} opacity="0.65" />
        <rect x="5" y="22" width="4" height="7" rx="1.5" fill={fill} opacity="0.5" />
        <rect x="25" y="22" width="4" height="7" rx="1.5" fill={fill} opacity="0.5" />
      </svg>
      <span className="text-[10px] font-bold leading-none" style={{ color: labelColor }}>
        {num}
      </span>
    </button>
  );
}

// ─── Bus layout builder ───────────────────────────────────────────────────────

type LayoutRow =
  | { kind: 'driver'; right: string[] }
  | { kind: 'front'; left: string[]; right: string[] }
  | { kind: 'normal'; left: string[]; right: string[] }
  | { kind: 'exit-door'; left: string[] }
  | { kind: 'last'; seats: string[] };

function buildLayout(seatNums: string[]): LayoutRow[] {
  const rows: LayoutRow[] = [];
  let i = 0;
  const n = seatNums.length;
  const take = (count: number) => { const s = seatNums.slice(i, i + count); i += count; return s; };

  if (n < 20) {
    rows.push({ kind: 'driver', right: take(Math.min(2, n)) });
    while (i < n - 6 && n - i > 6)
      rows.push({ kind: 'normal', left: take(3), right: take(Math.min(2, n - i - 6)) });
    if (i < n) rows.push({ kind: 'last', seats: take(n - i) });
    return rows;
  }

  const k = Math.round((n - 20) / 5);
  rows.push({ kind: 'driver', right: take(2) });
  rows.push({ kind: 'front', left: take(2), right: take(2) });
  for (let r = 0; r < k; r++) rows.push({ kind: 'normal', left: take(3), right: take(2) });
  rows.push({ kind: 'exit-door', left: take(3) });
  rows.push({ kind: 'normal', left: take(3), right: take(2) });
  rows.push({ kind: 'last', seats: take(6) });
  return rows;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeatMap({
  journeyId,
  onSelect,
  selectedSeats = [],
}: {
  journeyId: string;
  onSelect: (seats: string[]) => void;
  selectedSeats?: string[];
}) {
  const [seatMap, setSeatMap] = useState<SeatMapType | null>(null);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedSeats);
  // 30 s tick so held-urgency colours re-render automatically
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchSeatMap(journeyId).then((m) => setSeatMap(m));
    const unsub = listenSeatMap(journeyId, (m) => setSeatMap(m));
    return () => unsub();
  }, [journeyId]);

  // Tick every 30 s to refresh urgency colours without an extra Firestore read
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!seatMap) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        Loading seats…
      </div>
    );
  }

  const rawSeats = seatMap.seats ?? {};
  const seatNums = Object.keys(rawSeats).sort((a, b) => Number(a) - Number(b));

  async function handleClick(num: string) {
    const seat = rawSeats[num];
    if (!seat) return;

    if (localSelected.includes(num)) {
      const next = localSelected.filter((s) => s !== num);
      setLocalSelected(next);
      onSelect(next);
      return;
    }

    if (seat.status !== 'available') return;

    try {
      await holdSeatTransaction(journeyId, num);
      const next = [...localSelected, num];
      setLocalSelected(next);
      onSelect(next);
    } catch (err) {
      alert((err as any).message || 'Could not hold seat. Please try another.');
    }
  }

  function seatStatus(num: string): SeatStatus {
    if (localSelected.includes(num)) return 'selected';
    const s = rawSeats[num]?.status;
    if (s === 'booked') return 'booked';
    if (s === 'held') return 'held';
    return 'available';
  }

  const available = seatNums.filter((n) => rawSeats[n]?.status === 'available').length;
  const sold      = seatNums.filter((n) => ['booked', 'held'].includes(rawSeats[n]?.status)).length;

  const layout = buildLayout(seatNums);

  const CELL  = 'flex items-center justify-center w-10';
  const AISLE = 'w-6 shrink-0';

  const renderSeat = (num: string) => (
    <SeatBtn
      key={num}
      num={num}
      status={seatStatus(num)}
      heldUntil={(rawSeats[num] as Seat)?.heldUntil}
      onClick={() => handleClick(num)}
    />
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 select-none overflow-x-auto">

      {/* ── 15-minute hold notice ── */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-snug">
          <span className="font-semibold">Selected seats are held for 15 minutes.</span>{' '}
          If payment is not completed within this time, the seat will be released and
          another passenger may book it.
        </p>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm bg-blue-900" />
          Available ({available})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm bg-red-600" />
          Sold / Held ({sold})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm bg-yellow-500 ring-2 ring-yellow-300" />
          Your Selection ({localSelected.length})
        </span>
      </div>

      {/* ── Bus body ── */}
      <div className="inline-flex flex-col gap-2 mx-auto">
        {layout.map((row, ri) => {

          if (row.kind === 'driver') {
            return (
              <div key={ri} className="flex items-center gap-1">
                <div className={`${CELL} shrink-0`}><SteeringWheel /></div>
                <div className={CELL} />
                <div className={CELL} />
                <div className={AISLE} />
                {row.right.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
              </div>
            );
          }

          if (row.kind === 'front') {
            return (
              <div key={ri}>
                <div className="flex items-center gap-1 mb-1">
                  <div className={CELL} /><div className={CELL} /><div className={CELL} />
                  <div className={AISLE} />
                  <div className="flex items-center justify-center" style={{ width: 84 }}>
                    <DoorIcon />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {row.left.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
                  <div className={CELL} />
                  <div className={AISLE} />
                  {row.right.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
                </div>
              </div>
            );
          }

          if (row.kind === 'normal') {
            return (
              <div key={ri} className="flex items-center gap-1">
                {row.left.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
                <div className={AISLE} />
                {row.right.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
              </div>
            );
          }

          if (row.kind === 'exit-door') {
            return (
              <div key={ri} className="flex items-center gap-1">
                {row.left.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
                <div className={AISLE} />
                <div className="flex items-center justify-center" style={{ width: 84 }}>
                  <DoorIcon />
                </div>
              </div>
            );
          }

          if (row.kind === 'last') {
            return (
              <div key={ri} className="flex items-center gap-1 mt-1">
                {row.seats.map((n) => <div key={n} className={CELL}>{renderSeat(n)}</div>)}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ── Selected seat chips ── */}
      {localSelected.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 font-medium mr-1 self-center">Selected:</span>
          {localSelected
            .slice()
            .sort((a, b) => Number(a) - Number(b))
            .map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-700 text-white text-xs font-semibold rounded-full"
              >
                Seat {s}
                <button
                  onClick={() => handleClick(s)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
