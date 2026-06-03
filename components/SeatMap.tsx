"use client";
import { useEffect, useState } from 'react';
import { listenSeatMap, fetchSeatMap, holdSeatTransaction } from '../lib/firestore';

const SeatSquare = ({ number, status, onClick }: any) => {
  const bg = status === 'available' ? 'bg-blue-900' : status === 'booked' ? 'bg-red-600' : 'bg-yellow-400';
  return (
    <div onClick={onClick} className={`w-10 h-10 flex items-center justify-center text-white rounded cursor-pointer ${bg}`}>{number}</div>
  );
};

export default function SeatMap({ journeyId, onSelect }: any) {
  const [seatMap, setSeatMap] = useState<any>(null);

  useEffect(() => {
    fetchSeatMap(journeyId).then((m) => setSeatMap(m));
    const unsub = listenSeatMap(journeyId, (m) => setSeatMap(m));
    return () => unsub();
  }, [journeyId]);

  if (!seatMap) return <div>Loading seats...</div>;

  const seats = Object.keys(seatMap.seats || {}).map((s) => ({ num: s, ...seatMap.seats[s] }));

  return (
    <div className="p-4 border rounded">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">🚍</div>
        <div className="text-sm">Driver/Steering</div>
      </div>
      <div className="grid grid-cols-4 gap-3 mt-4">
        {seats.map((s: any) => (
          <SeatSquare key={s.num} number={s.num} status={s.status} onClick={async ()=>{
            if (s.status !== 'available') return;
            try{
              await holdSeatTransaction(journeyId, s.num);
              onSelect(s.num);
            }catch(err){
              alert((err as any).message || 'Could not hold seat');
            }
          }} />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-900" /> Available</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-600" /> Sold</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400" /> Selected</div>
      </div>
    </div>
  );
}
