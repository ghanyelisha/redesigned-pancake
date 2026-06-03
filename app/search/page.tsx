"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DateStrip from '../../components/DateStrip';
import JourneyCard from '../../components/JourneyCard';
import { fetchJourneys } from '../../lib/firestore';

export default function SearchPage() {
  const params = useSearchParams();
  const origin = params.get('origin') || 'Yaoundé';
  const destination = params.get('destination') || 'Douala';
  const date = params.get('date') || new Date().toISOString().slice(0,10);

  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchJourneys(origin, destination, date).then((list) => { setJourneys(list); setLoading(false); });
  }, [origin, destination, date]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-blue-900 text-white rounded p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div>{origin} → {destination}</div>
          <div className="ml-auto">{date}</div>
        </div>
      </div>

      <DateStrip centerDate={date} origin={origin} destination={destination} />

      <h3 className="text-lg font-semibold my-4">Total {journeys.length} Bus(es) found</h3>

      {loading ? <div>Loading...</div> : journeys.map(j => <JourneyCard key={j.id} journey={j} />)}
    </div>
  );
}
