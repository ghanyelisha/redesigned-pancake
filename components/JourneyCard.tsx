"use client";
import Link from 'next/link';
import { ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function JourneyCard({ journey }: any) {
  const [expanded, setExpanded] = useState(false);
  const isSoldOut = journey.availableSeats === 0;
  const seats = journey.availableSeats ?? journey.totalSeats ?? 0;
  const hasDiscount = journey.originalPrice && journey.originalPrice > journey.pricePerSeat;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-3 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start">

          {/* ── Left: operator + route ── */}
          <div className="flex-1 min-w-0">
            {/* Operator row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-teal-700/10 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 shrink-0">
                {journey.operatorName?.slice(0, 2).toUpperCase() || 'MB'}
              </div>
              <span className="font-semibold text-slate-900 text-sm">{journey.operatorName}</span>
            </div>

            {/* Times + arrow */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 leading-none">{journey.departureTime}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {journey.origin?.slice(0, 3).toUpperCase() || 'ORG'}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-0.5">
                <div className="text-[11px] text-slate-400">{journey.duration || '~8h'} (Approx)</div>
                <div className="w-full flex items-center gap-1">
                  <div className="h-px flex-1 bg-slate-300" />
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="text-slate-400">
                    <path d="M1 5h11M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 leading-none">{journey.estimatedArrivalTime}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {journey.destination?.slice(0, 3).toUpperCase() || 'DST'}
                </div>
              </div>
            </div>

            {/* Date + boarding */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{journey.departureDate || journey.date}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-teal-600" />
                Departs From: <span className="text-slate-700 font-medium ml-0.5">{journey.boardingStation}</span>
              </span>
            </div>
          </div>

          {/* ── Right: price + button ── */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 w-full sm:w-auto sm:min-w-[150px]">
            <div className="text-right">
              {hasDiscount && (
                <div className="text-xs text-slate-400 line-through">FCFA {journey.originalPrice}</div>
              )}
              <div className="text-xl font-extrabold text-slate-900">FCFA {journey.pricePerSeat?.toLocaleString()}</div>
              <div className={`text-xs mt-0.5 font-medium ${isSoldOut ? 'text-orange-500' : 'text-slate-500'}`}>
                {isSoldOut ? '0 Seats Available' : `${seats} Seats Available at`}
              </div>
            </div>

            {isSoldOut ? (
              <div className="bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-not-allowed whitespace-nowrap">
                SOLD OUT
              </div>
            ) : (
              <Link
                href={`/book/${journey.id}`}
                className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
              >
                BOOK TICKET
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* More Details toggle */}
      <div className="border-t border-slate-100 px-5 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-teal-700 font-semibold hover:text-teal-900 transition-colors"
        >
          More Details
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="mt-2 pb-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div><span className="font-medium text-slate-700">Class:</span> {journey.journeyClass || 'Economy'}</div>
            <div><span className="font-medium text-slate-700">Bus Code:</span> {journey.busCode || '—'}</div>
            <div><span className="font-medium text-slate-700">Drop-off:</span> {journey.droppingStation || '—'}</div>
            <div><span className="font-medium text-slate-700">Total Seats:</span> {journey.totalSeats || '—'}</div>
            <div><span className="font-medium text-slate-700">Available:</span> {seats}</div>
          </div>
        )}
      </div>
    </div>
  );
}
