"use client";
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const SIZE_OPTIONS = [
  'No luggage',
  'Small (up to 5kg)',
  'Medium (5–15kg)',
  'Large (15–25kg)',
  'Extra Large (over 25kg)',
];

const TYPE_OPTIONS = [
  'General goods',
  'Foodstuff',
  'Fragile items',
  'Liquids',
  'Hard solids',
];

export default function LuggageOptions({ onChange }: { onChange?: (v: { size: string; types: string[] }) => void }) {
  const [size, setSize] = useState('No luggage');
  const [types, setTypes] = useState<string[]>([]);

  function handleSizeChange(newSize: string) {
    setSize(newSize);
    onChange?.({ size: newSize, types });
  }

  function toggleType(t: string) {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    setTypes(next);
    onChange?.({ size, types: next });
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors bg-white';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-teal-700/10 flex items-center justify-center text-teal-700 text-xs">📦</span>
        Luggage Declaration
      </h4>

      {/* Size — single select MCQ */}
      <div>
        <label className={labelClass}>Luggage Size</label>
        <div className="space-y-2">
          {SIZE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                size === opt
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:border-teal-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  size === opt ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                }`}
              >
                {size === opt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <input
                type="radio"
                name="luggageSize"
                value={opt}
                checked={size === opt}
                onChange={() => handleSizeChange(opt)}
                className="sr-only"
              />
              <span className="text-sm text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Type — multi-select checkboxes */}
      {size !== 'No luggage' && (
        <div>
          <label className={labelClass}>Luggage Type (select all that apply)</label>
          <div className="space-y-2">
            {TYPE_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  types.includes(opt)
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={types.includes(opt)}
                  onChange={() => toggleType(opt)}
                  className="w-4 h-4 accent-teal-700 rounded"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Restrictions warning */}
      <div className="flex gap-2.5 p-3.5 bg-red-50 border border-red-300 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <p className="text-xs text-red-700 leading-relaxed">
          <span className="font-semibold">Prohibited items:</span> Flammable goods including fuel, gas bottles, aerosols, and compressed substances are strictly prohibited on all MyBus services. Passengers found carrying prohibited items will be refused boarding without refund.
        </p>
      </div>
    </div>
  );
}
