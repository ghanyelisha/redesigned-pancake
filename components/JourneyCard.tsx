"use client";
import Link from 'next/link';
import { ChevronDown, MapPin, Wifi, Droplets } from 'lucide-react';
import { useState } from 'react';

/** Calculate duration string from HH:MM departure and arrival times */
function calcDuration(dep?: string, arr?: string): string {
  if (!dep || !arr) return '';
  const [dh, dm] = dep.split(':').map(Number);
  const [ah, am] = arr.split(':').map(Number);
  let mins = ah * 60 + am - (dh * 60 + dm);
  if (mins < 0) mins += 24 * 60; // overnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

export default function JourneyCard({ journey }: any) {
  const [expanded, setExpanded] = useState(false);
  const isSoldOut = (journey.availableSeats ?? journey.totalSeats ?? 0) === 0;
  const seats = journey.availableSeats ?? journey.totalSeats ?? 0;
  const duration = calcDuration(journey.departureTime, journey.estimatedArrivalTime);
  const amenities: string[] = journey.amenities ?? [];
  const hasWifi = amenities.includes('WiFi');
  const hasWater = amenities.includes('Water');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-3 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start">

          {/* ── Left: operator + route + times ── */}
          <div className="flex-1 min-w-0">
            {/* Operator row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="w-9 h-9 rounded-full bg-teal-700/10 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 shrink-0">
                {journey.operatorName?.slice(0, 2).toUpperCase() || 'MB'}
              </div>
              <span className="font-semibold text-slate-900 text-sm">{journey.operatorName}</span>
              {journey.busCode && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {journey.busCode}
                </span>
              )}
              {journey.journeyClass && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  journey.journeyClass === 'VIP'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {journey.journeyClass}
                </span>
              )}
            </div>

            {/* Times + arrow */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 leading-none">{journey.departureTime || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {journey.origin?.slice(0, 3).toUpperCase() || 'ORG'}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-0.5">
                <div className="text-[11px] text-slate-400">{duration || '—'}</div>
                <div className="w-full flex items-center gap-1">
                  <div className="h-px flex-1 bg-slate-300" />
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="text-slate-400">
                    <path d="M1 5h11M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 leading-none">{journey.estimatedArrivalTime || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {journey.destination?.slice(0, 3).toUpperCase() || 'DST'}
                </div>
              </div>
            </div>

            {/* Date + stations row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{journey.departureDate || journey.date}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-teal-600" />
                <span className="text-slate-600 font-medium">{journey.boardingStation || '—'}</span>
                <span className="text-slate-400">→</span>
                <span className="text-slate-600 font-medium">{journey.droppingStation || '—'}</span>
              </span>
            </div>

            {/* Amenities row */}
            {(hasWifi || hasWater) && (
              <div className="mt-2 flex items-center gap-2">
                {hasWifi && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                    <Wifi className="h-3 w-3 text-teal-600" />
                    WiFi
                  </span>
                )}
                {hasWater && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    Water
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Right: price + seat count + button ── */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 w-full sm:w-auto sm:min-w-[155px]">
            <div className="text-right">
              <div className="text-xl font-extrabold text-slate-900">
                FCFA {(journey.pricePerSeat ?? 0).toLocaleString('fr-FR')}
              </div>
              <div className={`text-xs mt-0.5 font-medium ${isSoldOut ? 'text-red-500' : 'text-slate-500'}`}>
                {isSoldOut ? 'Sold out' : `${seats} seat${seats !== 1 ? 's' : ''} available`}
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
                View Seat
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* All Stations collapsible */}
      <div className="border-t border-slate-100 px-5 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-teal-700 font-semibold hover:text-teal-900 transition-colors"
        >
          All Stations
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="mt-2 pb-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Boarding Station</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-teal-600" />{journey.boardingStation || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Dropping Station</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" />{journey.droppingStation || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Bus Code</span>
              <span className="font-mono">{journey.busCode || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Class</span>
              <span>{journey.journeyClass || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Total Seats</span>
              <span>{journey.totalSeats || '—'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Available</span>
              <span className={seats === 0 ? 'text-red-600 font-semibold' : 'text-teal-700 font-semibold'}>{seats}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
