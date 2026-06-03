"use client";
import { useEffect, useState } from 'react';
import { listenSeatMap, fetchSeatMap, holdSeatTransaction } from '../lib/firestore';

// Sofa/armchair SVG icon for each seat
function SeatIcon({ status, onClick, number }: { status: string; onClick: () => void; number: string }) {
  const isAvailable = status === 'available';
  const isBooked = status === 'booked';
  const isSelected = status === 'held' || status === 'selected';

  const colorClass = isBooked
    ? 'text-slate-400 cursor-not-allowed'
    : isSelected
    ? 'text-teal-700 cursor-pointer'
    : 'text-teal-700 cursor-pointer hover:text-teal-900';

  const bgClass = isBooked
    ? 'bg-slate-100'
    : isSelected
    ? 'bg-teal-100 ring-2 ring-teal-500'
    : 'bg-white hover:bg-teal-50';

  return (
    <button
      onClick={isBooked ? undefined : onClick}
      disabled={isBooked}
      title={`Seat ${number} — ${status}`}
      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all ${bgClass} ${
        isBooked ? 'border-slate-200' : isSelected ? 'border-teal-500' : 'border-slate-200 hover:border-teal-400'
      }`}
    >
      {/* Armchair SVG */}
      <svg
        width="28"
        height="24"
        viewBox="0 0 28 24"
        fill="none"
        className={`${colorClass} transition-colors`}
        aria-hidden
      >
        {/* backrest */}
        <rect x="4" y="1" width="20" height="11" rx="3" fill="currentColor" opacity={isBooked ? 0.35 : 0.9} />
        {/* seat */}
        <rect x="2" y="12" width="24" height="7" rx="2" fill="currentColor" opacity={isBooked ? 0.25 : 0.75} />
        {/* left armrest */}
        <rect x="1" y="10" width="4" height="10" rx="2" fill="currentColor" opacity={isBooked ? 0.2 : 0.6} />
        {/* right armrest */}
        <rect x="23" y="10" width="4" height="10" rx="2" fill="currentColor" opacity={isBooked ? 0.2 : 0.6} />
        {/* legs */}
        <rect x="5" y="19" width="3" height="4" rx="1" fill="currentColor" opacity={isBooked ? 0.2 : 0.5} />
        <rect x="20" y="19" width="3" height="4" rx="1" fill="currentColor" opacity={isBooked ? 0.2 : 0.5} />
      </svg>
      <span className={`text-[10px] font-semibold leading-none ${isBooked ? 'text-slate-400' : isSelected ? 'text-teal-700' : 'text-slate-600'}`}>
        {number}
      </span>
    </button>
  );
}

export default function SeatMap({
  journeyId,
  onSelect,
  selectedSeat,
}: {
  journeyId: string;
  onSelect: (seat: string | null) => void;
  selectedSeat?: string | null;
}) {
  const [seatMap, setSeatMap] = useState<any>(null);
  const [localSelected, setLocalSelected] = useState<string | null>(selectedSeat || null);

  useEffect(() => {
    fetchSeatMap(journeyId).then((m) => setSeatMap(m));
    const unsub = listenSeatMap(journeyId, (m) => setSeatMap(m));
    return () => unsub();
  }, [journeyId]);

  if (!seatMap) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        Loading seats…
      </div>
    );
  }

  const seats: { num: string; status: string }[] = Object.keys(seatMap.seats || {}).map((s) => ({
    num: s,
    ...seatMap.seats[s],
  }));

  async function handleClick(seat: { num: string; status: string }) {
    if (seat.status !== 'available' && seat.num !== localSelected) return;

    // Toggle off if clicking the same seat
    if (seat.num === localSelected) {
      setLocalSelected(null);
      onSelect(null);
      return;
    }

    try {
      await holdSeatTransaction(journeyId, seat.num);
      setLocalSelected(seat.num);
      onSelect(seat.num);
    } catch (err) {
      alert((err as any).message || 'Could not hold seat');
    }
  }

  // Split into rows of 4 with aisle gap (2+2 layout)
  const rows: typeof seats[] = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  const available = seats.filter((s) => s.status === 'available').length;
  const sold = seats.filter((s) => s.status === 'booked').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-white border-2 border-teal-700" />
          Available ({available})
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-slate-200 border border-slate-300" />
          Sold ({sold})
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-teal-100 border-2 border-teal-500" />
          Selected
        </div>
      </div>

      {/* Bus front */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-9 h-9 rounded-full bg-teal-700/10 border border-teal-100 flex items-center justify-center text-lg">
          🚌
        </div>
        <div className="text-xs text-slate-500 font-medium">Driver</div>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Seat grid — 2 + aisle + 2 layout */}
      <div className="flex flex-col gap-2 overflow-x-auto">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1 justify-center">
            {/* Left 2 seats */}
            {row.slice(0, 2).map((s) => (
              <SeatIcon
                key={s.num}
                number={s.num}
                status={s.num === localSelected ? 'selected' : s.status}
                onClick={() => handleClick(s)}
              />
            ))}
            {/* Aisle */}
            <div className="w-6" />
            {/* Right 2 seats */}
            {row.slice(2, 4).map((s) => (
              <SeatIcon
                key={s.num}
                number={s.num}
                status={s.num === localSelected ? 'selected' : s.status}
                onClick={() => handleClick(s)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
