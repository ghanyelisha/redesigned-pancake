"use client";
import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Select Trip', sub: 'Where and when are you going' },
  { label: 'Choose Bus Operator', sub: 'Which bus works best for you' },
  { label: 'Select Seats', sub: 'Choose your preferred seat' },
  { label: 'Payment & Ticket', sub: 'Pay and confirm your booking' },
];

export default function BookingStepper({ activeStep }: { activeStep: number }) {
  // activeStep is 1-indexed: 1=Select Trip, 2=Choose Bus Operator, etc.
  return (
    <div className="w-full bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start">
          {STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const done = stepNum < activeStep;
            const active = stepNum === activeStep;
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center py-4 relative">
                {/* connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute top-[22px] left-1/2 w-full h-px bg-slate-200" />
                )}
                {/* circle */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  done
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : active
                    ? 'bg-white border-teal-700 text-teal-700'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}>
                  {done ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                {/* text */}
                <div className="mt-2 text-center hidden sm:block">
                  <div className={`text-xs font-semibold ${active ? 'text-teal-700' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 max-w-[100px] leading-tight">
                    {step.sub}
                  </div>
                </div>
                {/* active underline */}
                {active && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-700 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
