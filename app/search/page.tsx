"use client";
import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeftRight, MapPin, Calendar, Search, SlidersHorizontal, X, Bus } from 'lucide-react';
import JourneyCard from '../../components/JourneyCard';
import DateStrip from '../../components/DateStrip';
import BookingStepper from '../../components/BookingStepper';
import { fetchJourneys, listenSeatMap } from '../../lib/firestore';

const CITIES = ['Yaoundé', 'Douala', 'Bamenda', 'Buea', 'Limbé', 'Kumba', 'Bafoussam', 'Ngaoundéré'];

// ── Inline search bar used at top of results page ──
function SearchBar({ origin, destination, date }: { origin: string; destination: string; date: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(origin);
  const [to, setTo] = useState(destination);
  const [d, setD] = useState(date);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${d}`);
  }

  return (
    <form onSubmit={submit} className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center gap-2">
        {/* From */}
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <MapPin className="h-4 w-4 text-teal-700 shrink-0" />
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent outline-none"
          >
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Swap */}
        <button type="button" onClick={swap} className="p-2 rounded-full border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors shrink-0">
          <ArrowLeftRight className="h-4 w-4 text-teal-700" />
        </button>

        {/* To */}
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <MapPin className="h-4 w-4 text-teal-700 shrink-0" />
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent outline-none"
          >
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <Calendar className="h-4 w-4 text-teal-700 shrink-0" />
          <input
            type="date"
            value={d}
            onChange={(e) => setD(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent outline-none"
          />
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shrink-0"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}

// ── Filter sidebar ──
function FilterSidebar({
  journeys,
  onFiltered,
}: {
  journeys: any[];
  onFiltered: (list: any[]) => void;
}) {
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'seats'>('price-asc');
  const [onlySeats, setOnlySeats] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedOps, setSelectedOps] = useState<string[]>([]);

  const operators = Array.from(new Set(journeys.map((j) => j.operatorName).filter(Boolean)));

  function toggleOp(op: string) {
    setSelectedOps((prev) =>
      prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]
    );
  }

  function clear() {
    setSortBy('price-asc');
    setOnlySeats(false);
    setMinPrice('');
    setMaxPrice('');
    setSelectedOps([]);
  }

  // Apply filters whenever dependencies change
  useEffect(() => {
    let result = [...journeys];

    if (onlySeats) result = result.filter((j) => (j.availableSeats ?? j.totalSeats ?? 1) > 0);
    if (minPrice) result = result.filter((j) => j.pricePerSeat >= Number(minPrice));
    if (maxPrice) result = result.filter((j) => j.pricePerSeat <= Number(maxPrice));
    if (selectedOps.length > 0) result = result.filter((j) => selectedOps.includes(j.operatorName));

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.pricePerSeat - b.pricePerSeat;
      if (sortBy === 'price-desc') return b.pricePerSeat - a.pricePerSeat;
      return (b.availableSeats ?? b.totalSeats ?? 0) - (a.availableSeats ?? a.totalSeats ?? 0);
    });

    onFiltered(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys, sortBy, onlySeats, minPrice, maxPrice, selectedOps]);

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-teal-700" />
            Sort and Filter
          </div>
          <button onClick={clear} className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1">
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Sort by */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Sort By</div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sortBy === 'seats'}
                  onChange={() => setSortBy(sortBy === 'seats' ? 'price-asc' : 'seats')}
                  className="accent-teal-700"
                />
                Seats Available
              </label>
            </div>
          </div>

          {/* Price sort */}
          <div>
            <button
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2"
              onClick={() => {}}
            >
              <span>Prices</span>
              <span className="normal-case font-normal text-slate-400">(Lowest)</span>
            </button>
            <div className="space-y-1.5">
              {[
                { label: 'Low – High', value: 'price-asc' as const },
                { label: 'High – Low', value: 'price-desc' as const },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sortBy === opt.value}
                    onChange={() => setSortBy(opt.value)}
                    className="accent-teal-700"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Price Range</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 flex-1">
                <span className="text-xs text-slate-400">₣</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full text-xs text-slate-700 outline-none bg-transparent"
                />
              </div>
              <span className="text-slate-300 text-sm">to</span>
              <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 flex-1">
                <span className="text-xs text-slate-400">₣</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full text-xs text-slate-700 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Operators */}
          {operators.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Operators</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {operators.map((op) => (
                  <label key={op} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOps.includes(op)}
                      onChange={() => toggleOp(op)}
                      className="accent-teal-700"
                    />
                    {op}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Seats available filter */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlySeats}
                onChange={(e) => setOnlySeats(e.target.checked)}
                className="accent-teal-700"
              />
              Show available only
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Main search results content ──
function SearchResults() {
  const params = useSearchParams();
  const origin = params.get('origin') || 'Yaoundé';
  const destination = params.get('destination') || 'Douala';
  const date = params.get('date') || new Date().toISOString().slice(0, 10);

  const [journeys, setJourneys] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Live seat counts keyed by journey id
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    fetchJourneys(origin, destination, date).then((list) => {
      setJourneys(list);
      setFiltered(list);
      setLoading(false);
    });
  }, [origin, destination, date]);

  // Subscribe to live seat availability for all loaded journeys
  useEffect(() => {
    if (journeys.length === 0) return;
    const unsubs = journeys
      .filter((j) => j.id)
      .map((j) =>
        listenSeatMap(j.id, (seatMap) => {
          if (!seatMap) return;
          const available = Object.values(seatMap.seats ?? {}).filter(
            (s: any) => s.status === 'available'
          ).length;
          setLiveCounts((prev) => ({ ...prev, [j.id]: available }));
        })
      );
    return () => unsubs.forEach((u) => u());
  }, [journeys]);

  return (
    <>
      <SearchBar origin={origin} destination={destination} date={date} />
      <BookingStepper activeStep={2} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DateStrip centerDate={date} origin={origin} destination={destination} />

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          {/* Sidebar */}
          <FilterSidebar journeys={journeys} onFiltered={setFiltered} />

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-xl border border-slate-200 h-32 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Bus className="h-4 w-4 text-teal-700" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-teal-700 font-bold">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''} found for you
                  </p>
                </div>
                {filtered.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
                    No buses found for this route and date. Try adjusting your filters.
                  </div>
                ) : (
                  filtered.map((j) => (
                    <JourneyCard
                      key={j.id}
                      journey={
                        j.id && liveCounts[j.id] !== undefined
                          ? { ...j, availableSeats: liveCounts[j.id] }
                          : j
                      }
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Bus className="h-8 w-8 text-teal-700 animate-bounce" />
              <span className="text-sm">Loading journeys…</span>
            </div>
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
