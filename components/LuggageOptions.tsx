"use client";
import { useState } from 'react';

export default function LuggageOptions({ onChange }: any) {
  const [size, setSize] = useState('No luggage');
  const [types, setTypes] = useState<string[]>([]);

  const typeOptions = ['General goods', 'Foodstuff', 'Fragile items', 'Liquids', 'Hard solids'];

  function toggleType(t: string) {
    setTypes((prev) => prev.includes(t) ? prev.filter(x => x!==t) : [...prev, t]);
  }

  return (
    <div className="space-y-2">
      <div className="font-semibold">Luggage Size</div>
      <select value={size} onChange={(e)=>{setSize(e.target.value); onChange?.({ size: e.target.value, types })}} className="p-2 border rounded">
        <option>No luggage</option>
        <option>Small (up to 5kg)</option>
        <option>Medium (5–15kg)</option>
        <option>Large (15–25kg)</option>
        <option>Extra Large (over 25kg)</option>
      </select>
      <div className="font-semibold">Luggage Type</div>
      <div className="flex flex-wrap gap-2">
        {typeOptions.map(t => (
          <label key={t} className="inline-flex items-center gap-2"><input type="checkbox" onChange={()=>{toggleType(t); onChange?.({ size, types })}} />{t}</label>
        ))}
      </div>
    </div>
  );
}
