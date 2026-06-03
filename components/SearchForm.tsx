"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const cities = ['Yaoundé', 'Douala', 'Buea', 'Limbé', 'Kumba'];

export default function SearchForm({ defaultFrom, defaultTo, defaultDate }: any) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom || 'Yaoundé');
  const [to, setTo] = useState(defaultTo || 'Douala');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));

  function submit(e: any) {
    e.preventDefault();
    router.push(`/search?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${date}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <select value={from} onChange={(e)=>setFrom(e.target.value)} className="p-3 rounded w-full md:w-1/3">
          {cities.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={to} onChange={(e)=>setTo(e.target.value)} className="p-3 rounded w-full md:w-1/3">
          {cities.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="p-3 rounded w-full md:w-1/4" />
        <button className="bg-blue-900 text-white px-6 py-3 rounded-full">Search Bus</button>
      </div>
    </form>
  );
}
