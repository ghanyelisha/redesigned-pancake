"use client";
import Link from 'next/link';

export default function JourneyCard({ journey }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-col md:flex-row justify-between">
      <div>
        <div className="text-sm text-slate-500">{journey.origin} - {journey.destination}</div>
        <div className="text-xl font-bold text-blue-900">{journey.operatorName}</div>
        <div className="text-xs text-slate-600">{journey.busCode}</div>
        <div className="mt-2">
          <div><span className="text-red-600 font-bold">{journey.departureTime}</span> — <span className="text-red-600 font-bold">{journey.estimatedArrivalTime}</span></div>
          <div className="text-sm">{journey.boardingStation} → {journey.droppingStation} • {journey.journeyClass}</div>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <div className="text-2xl font-extrabold">FCFA {journey.pricePerSeat.toFixed(2)}</div>
        <div className="text-sm text-slate-600">{journey.totalSeats} Seats</div>
        <Link href={`/book/${journey.id}`} className="mt-2 bg-blue-900 text-white px-4 py-2 rounded-full">View Seat</Link>
      </div>
    </div>
  );
}
