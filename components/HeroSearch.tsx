"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowLeftRight, Calendar, Search, ArrowRight } from 'lucide-react';

const CITIES = [
  'Bamenda',
  'Yaoundé',
  'Douala',
  'Bafoussam',
  'Buea',
  'Limbé',
  'Kumba',
  'Ngaoundéré',
  'Garoua',
  'Maroua',
];

const POPULAR = [
  { from: 'Bamenda', to: 'Yaoundé' },
  { from: 'Bamenda', to: 'Douala' },
  { from: 'Yaoundé', to: 'Douala' },
  { from: 'Bamenda', to: 'Bafoussam' },
];

export default function HeroSearch() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [tripType, setTripType] = useState<'one-way' | 'round'>('one-way');
  const [from, setFrom] = useState('Bamenda');
  const [to, setTo] = useState('Yaoundé');
  const [date, setDate] = useState(today);
  const [returnDate, setReturnDate] = useState('');

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!from || !to || !date) return;
    router.push(
      `/search?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${date}`
    );
  }

  function quickSearch(f: string, t: string) {
    setFrom(f);
    setTo(t);
    router.push(
      `/search?origin=${encodeURIComponent(f)}&destination=${encodeURIComponent(t)}&date=${today}`
    );
  }

  const inputBase =
    'w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium';

  return (
    <div className="w-full">
      {/* Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/8 overflow-hidden">
        {/* Trip type toggle */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-0">
          {(['one-way', 'round'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${
                tripType === type
                  ? 'text-teal-700 border-teal-700 bg-teal-50/60'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  tripType === type ? 'border-teal-700' : 'border-slate-400'
                }`}
              >
                {tripType === type && <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />}
              </span>
              {type === 'one-way' ? 'One Way' : 'Round Trip'}
            </button>
          ))}
        </div>

        <div className="h-px bg-slate-100 mx-5" />

        {/* Search inputs */}
        <form onSubmit={search} className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">

            {/* From */}
            <div className="flex-1 flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all group">
              <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">From</p>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={inputBase + ' cursor-pointer'}
                  required
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap button */}
            <button
              type="button"
              onClick={swap}
              className="self-center sm:shrink-0 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 active:scale-95 transition-all shadow-sm"
              title="Swap cities"
            >
              <ArrowLeftRight className="h-4 w-4 text-teal-700" />
            </button>

            {/* To */}
            <div className="flex-1 flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">To</p>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={inputBase + ' cursor-pointer'}
                  required
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="flex-1 flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Departure</p>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputBase + ' cursor-pointer'}
                  required
                />
              </div>
            </div>

            {/* Return date (only for round trip) */}
            {tripType === 'round' && (
              <div className="flex-1 flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-3 hover:border-teal-400 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Return</p>
                  <input
                    type="date"
                    value={returnDate}
                    min={date}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className={inputBase + ' cursor-pointer'}
                  />
                </div>
              </div>
            )}

            {/* Search button */}
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold px-7 py-3.5 rounded-xl shadow-md shadow-teal-700/25 transition-all active:scale-95 whitespace-nowrap"
            >
              <Search className="h-4 w-4" />
              Search Buses
            </button>
          </div>
        </form>

        {/* Popular routes */}
        <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1 shrink-0">Popular:</span>
          {POPULAR.map((r) => (
            <button
              key={`${r.from}-${r.to}`}
              type="button"
              onClick={() => quickSearch(r.from, r.to)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all"
            >
              {r.from}
              <ArrowRight className="h-3 w-3" />
              {r.to}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
