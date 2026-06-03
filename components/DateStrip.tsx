"use client";
import { addDays, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateStrip({ centerDate, origin, destination }: any) {
  const center = new Date(centerDate + 'T00:00:00');
  const router = useRouter();

  const days = Array.from({ length: 7 }, (_, i) => addDays(center, i - 3));

  function goToDate(d: Date) {
    const iso = d.toISOString().slice(0, 10);
    router.push(`/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${iso}`);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => goToDate(addDays(center, -7))}
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50 transition-colors shrink-0"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4 text-slate-500" />
      </button>

      {days.map((d) => {
        const isCenter = d.toDateString() === center.toDateString();
        return (
          <button
            key={d.toISOString()}
            onClick={() => goToDate(d)}
            className={`min-w-[90px] px-3 py-2.5 rounded-lg border text-center transition-all shrink-0 ${
              isCenter
                ? 'bg-teal-700 border-teal-700 text-white shadow-md shadow-teal-700/20'
                : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50'
            }`}
          >
            <div className="text-xs font-bold">{format(d, 'dd MMM')}</div>
            <div className={`text-[10px] mt-0.5 ${isCenter ? 'text-teal-100' : 'text-slate-400'}`}>
              {format(d, 'EEE')}
            </div>
          </button>
        );
      })}

      <button
        onClick={() => goToDate(addDays(center, 7))}
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50 transition-colors shrink-0"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </button>
    </div>
  );
}
