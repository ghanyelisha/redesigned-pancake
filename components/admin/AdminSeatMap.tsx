"use client";
import { useState } from 'react';
import { X, User, Package, Unlock } from 'lucide-react';
import type { Booking, SeatMap } from '../../lib/firestore';

type SeatInfo = { num: string; status: string };

function SeatIcon({ status }: { status: string }) {
  const isBooked = status === 'booked';
  const isHeld = status === 'held';
  const isAvail = status === 'available';

  const bgClass = isBooked ? 'bg-slate-700' : isHeld ? 'bg-amber-400' : 'bg-teal-700/10 border-teal-300';
  const fgClass = isBooked ? 'text-white' : isHeld ? 'text-amber-900' : 'text-teal-700';

  return (
    <svg width="28" height="24" viewBox="0 0 28 24" fill="none" className={fgClass}>
      <rect x="4" y="1" width="20" height="11" rx="3" fill="currentColor" opacity={isAvail ? 0.4 : 0.9} />
      <rect x="2" y="12" width="24" height="7" rx="2" fill="currentColor" opacity={isAvail ? 0.3 : 0.75} />
      <rect x="1" y="10" width="4" height="10" rx="2" fill="currentColor" opacity={isAvail ? 0.25 : 0.6} />
      <rect x="23" y="10" width="4" height="10" rx="2" fill="currentColor" opacity={isAvail ? 0.25 : 0.6} />
      <rect x="5" y="19" width="3" height="4" rx="1" fill="currentColor" opacity={isAvail ? 0.2 : 0.5} />
      <rect x="20" y="19" width="3" height="4" rx="1" fill="currentColor" opacity={isAvail ? 0.2 : 0.5} />
    </svg>
  );
}

type Props = {
  seatMap: SeatMap;
  bookings: Record<string, Booking>;
  onRelease: (seatNum: string) => void;
  onChangeSeat?: (booking: Booking) => void;
};

export default function AdminSeatMap({ seatMap, bookings, onRelease, onChangeSeat }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const seats: SeatInfo[] = Object.keys(seatMap.seats ?? {})
    .sort((a, b) => Number(a) - Number(b))
    .map((num) => ({ num, status: seatMap.seats[num].status }));

  // Build rows of 4 (2+aisle+2)
  const rows: SeatInfo[][] = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  const activeSeat = seats.find((s) => s.num === active);
  const activeBooking = active ? bookings[active] : null;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-700/20 border border-teal-300" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" />Held</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-700" />Booked</span>
      </div>

      {/* Bus front */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🚌</span>
        <span className="text-xs text-slate-400 font-medium">Driver (Seat 1)</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Grid */}
      <div className="inline-flex flex-col gap-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1">
            {row.slice(0, 2).map((s) => (
              <SeatCell key={s.num} seat={s} isActive={active === s.num} onClick={() => setActive(active === s.num ? null : s.num)} />
            ))}
            <div className="w-5" />
            {row.slice(2, 4).map((s) => (
              <SeatCell key={s.num} seat={s} isActive={active === s.num} onClick={() => setActive(active === s.num ? null : s.num)} />
            ))}
          </div>
        ))}
      </div>

      {/* Popover */}
      {active && activeSeat && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Seat {active}</span>
            <button onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeSeat.status === 'available' ? (
            <p className="text-xs text-slate-500">This seat is available.</p>
          ) : activeBooking ? (
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-medium">{activeBooking.passengerName} {activeBooking.passengerSurname}</span>
              </div>
              <div className="text-slate-500">Ref: <span className="font-mono font-semibold text-slate-700">{activeBooking.bookingReference}</span></div>
              <div className="text-slate-500">Phone: {activeBooking.passengerPhone}</div>
              {activeBooking.luggageSize && activeBooking.luggageSize !== 'No luggage' && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Package className="h-3 w-3" />
                  {activeBooking.luggageSize}
                  {(activeBooking.luggageTypes?.length ?? 0) > 0 && ` — ${activeBooking.luggageTypes!.join(', ')}`}
                </div>
              )}
              <div className="pt-2 flex items-center gap-2">
                {activeSeat.status === 'held' && (
                  <button
                    onClick={() => { onRelease(active); setActive(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <Unlock className="h-3 w-3" />
                    Release Hold
                  </button>
                )}
                {onChangeSeat && (
                  <button
                    onClick={() => { onChangeSeat(activeBooking); setActive(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors"
                  >
                    Change Seat
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Status: <strong>{activeSeat.status}</strong>
              {activeSeat.status === 'held' && (
                <button
                  onClick={() => { onRelease(active); setActive(null); }}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  <Unlock className="h-3 w-3" />
                  Release Hold
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeatCell({
  seat,
  isActive,
  onClick,
}: {
  seat: SeatInfo;
  isActive: boolean;
  onClick: () => void;
}) {
  const isAvail = seat.status === 'available';
  const bg = isAvail
    ? 'bg-white border-slate-200 hover:border-teal-400'
    : seat.status === 'held'
    ? 'bg-amber-50 border-amber-300'
    : 'bg-slate-700/10 border-slate-400';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all ${bg} ${isActive ? 'ring-2 ring-teal-500' : ''}`}
    >
      <SeatIcon status={seat.status} />
      <span className={`text-[10px] font-semibold leading-none ${isAvail ? 'text-slate-500' : seat.status === 'held' ? 'text-amber-700' : 'text-slate-700'}`}>
        {seat.num}
      </span>
    </button>
  );
}
