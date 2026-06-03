"use client";
import { addDays, format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function DateStrip({ centerDate, origin, destination }: any) {
  const center = new Date(centerDate);
  const router = useRouter();

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(center, i - 3);
    return d;
  });

  function goToDate(d: Date) {
    const iso = d.toISOString().slice(0, 10);
    router.push(`/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${iso}`);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-4">
      <button onClick={() => goToDate(addDays(center, -7))} className="p-2">◀</button>
      {days.map((d) => (
        <button key={d.toISOString()} onClick={() => goToDate(d)} className={`min-w-[120px] p-3 border rounded ${d.toDateString()===center.toDateString()? 'bg-white shadow-md text-blue-800':'bg-slate-50'}`}>
          <div className="text-sm">{format(d, 'dd-MM-yyyy')}</div>
          <div className="text-xs">{format(d, 'EEEE')}</div>
        </button>
      ))}
      <button onClick={() => goToDate(addDays(center, 7))} className="p-2">▶</button>
    </div>
  );
}
