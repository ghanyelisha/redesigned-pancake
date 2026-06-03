"use client";
import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Journey } from '../../lib/firestore';
import { createJourney, updateJourney } from '../../lib/adminFirestore';

const CITIES = ['Yaoundé', 'Douala', 'Buea', 'Limbé', 'Kumba', 'Bamenda', 'Bafoussam', 'Ngaoundéré'];
const BUS_TYPES: { label: string; seats: number }[] = [
  { label: '85-seater', seats: 85 },
  { label: '80-seater', seats: 80 },
  { label: '75-seater', seats: 75 },
  { label: '70-seater', seats: 70 },
  { label: '50-seater', seats: 50 },
  { label: '30-seater', seats: 30 },
];
const AMENITIES = ['WiFi', 'Water', 'Air Conditioning'];
const CAR_STATUSES = ['Operational', 'Under Maintenance', 'Reserved'];
const JOURNEY_STATUSES = ['active', 'cancelled'];
const CLASSES = ['VIP', 'Classic'];

type FormData = {
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  estimatedArrivalTime: string;
  operatorName: string;
  busCode: string;
  busPlate: string;
  driverName: string;
  motorBoyName: string;
  busType: string;
  journeyClass: string;
  pricePerSeat: string;
  boardingStation: string;
  droppingStation: string;
  amenities: string[];
  carStatus: string;
  status: string;
};

const EMPTY: FormData = {
  origin: 'Bamenda',
  destination: 'Yaoundé',
  departureDate: '',
  departureTime: '',
  estimatedArrivalTime: '',
  operatorName: '',
  busCode: '',
  busPlate: '',
  driverName: '',
  motorBoyName: '',
  busType: '50-seater',
  journeyClass: 'Classic',
  pricePerSeat: '',
  boardingStation: '',
  droppingStation: '',
  amenities: [],
  carStatus: 'Operational',
  status: 'active',
};

function journeyToForm(j: Journey): FormData {
  return {
    origin: j.origin ?? 'Bamenda',
    destination: j.destination ?? 'Yaoundé',
    departureDate: j.departureDate ?? '',
    departureTime: j.departureTime ?? '',
    estimatedArrivalTime: j.estimatedArrivalTime ?? '',
    operatorName: j.operatorName ?? '',
    busCode: j.busCode ?? '',
    busPlate: j.busPlate ?? '',
    driverName: j.driverName ?? '',
    motorBoyName: j.motorBoyName ?? '',
    busType: j.busType ?? '50-seater',
    journeyClass: j.journeyClass ?? 'Classic',
    pricePerSeat: String(j.pricePerSeat ?? ''),
    boardingStation: j.boardingStation ?? '',
    droppingStation: j.droppingStation ?? '',
    amenities: j.amenities ?? [],
    carStatus: j.carStatus ?? 'Operational',
    status: j.status ?? 'active',
  };
}

export default function JourneyFormModal({
  journey,
  onClose,
  onSaved,
}: {
  journey: Journey | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = journey !== null;
  const [form, setForm] = useState<FormData>(isEdit ? journeyToForm(journey!) : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Reset form when journey prop changes
  useEffect(() => {
    setForm(journey ? journeyToForm(journey) : EMPTY);
    setErrors({});
    setGlobalError('');
  }, [journey]);

  function set(key: keyof FormData, value: string | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function toggleAmenity(a: string) {
    set('amenities', form.amenities.includes(a)
      ? form.amenities.filter((x) => x !== a)
      : [...form.amenities, a]);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.origin) e.origin = 'Required';
    if (!form.destination) e.destination = 'Required';
    if (form.origin === form.destination) e.destination = 'Must differ from origin';
    if (!form.departureDate) e.departureDate = 'Required';
    if (!form.departureTime) e.departureTime = 'Required';
    if (!form.estimatedArrivalTime) e.estimatedArrivalTime = 'Required';
    if (!form.operatorName.trim()) e.operatorName = 'Required';
    if (!form.busCode.trim()) e.busCode = 'Required';
    if (!form.busPlate.trim()) e.busPlate = 'Required';
    if (!form.driverName.trim()) e.driverName = 'Required';
    if (!form.motorBoyName.trim()) e.motorBoyName = 'Required';
    if (!form.boardingStation.trim()) e.boardingStation = 'Required';
    if (!form.droppingStation.trim()) e.droppingStation = 'Required';
    const price = Number(form.pricePerSeat);
    if (!form.pricePerSeat || isNaN(price) || price <= 0) e.pricePerSeat = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setGlobalError('');
    try {
      const busType = BUS_TYPES.find((b) => b.label === form.busType) ?? BUS_TYPES[1];
      const data: Omit<Journey, 'id'> = {
        origin: form.origin,
        destination: form.destination,
        departureDate: form.departureDate,
        departureTime: form.departureTime,
        estimatedArrivalTime: form.estimatedArrivalTime,
        operatorName: form.operatorName.trim(),
        busCode: form.busCode.trim(),
        busPlate: form.busPlate.trim(),
        driverName: form.driverName.trim(),
        motorBoyName: form.motorBoyName.trim(),
        busType: form.busType,
        totalSeats: busType.seats,
        journeyClass: form.journeyClass,
        pricePerSeat: Number(form.pricePerSeat),
        boardingStation: form.boardingStation.trim(),
        droppingStation: form.droppingStation.trim(),
        amenities: form.amenities,
        carStatus: form.carStatus,
        status: form.status,
      };
      if (isEdit && journey?.id) {
        await updateJourney(journey.id, data);
      } else {
        await createJourney(data);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setGlobalError(err.message ?? 'Failed to save journey');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: keyof FormData) =>
    `w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white placeholder:text-slate-400 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
        : 'border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20'
    }`;

  const label = (text: string) => (
    <label className="block text-xs font-semibold text-slate-600 mb-1">{text}</label>
  );

  const err = (field: keyof FormData) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Journey' : 'Create Journey'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {globalError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {globalError}
            </div>
          )}

          <form id="journey-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Route */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-teal-700 border-b border-teal-100 pb-1.5 w-full">Route</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Origin')}
                  <select value={form.origin} onChange={(e) => set('origin', e.target.value)} className={inputCls('origin')}>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {err('origin')}
                </div>
                <div>
                  {label('Destination')}
                  <select value={form.destination} onChange={(e) => set('destination', e.target.value)} className={inputCls('destination')}>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {err('destination')}
                </div>
                <div>
                  {label('Boarding Station')}
                  <input value={form.boardingStation} onChange={(e) => set('boardingStation', e.target.value)} placeholder="e.g. Nkwen Park" className={inputCls('boardingStation')} />
                  {err('boardingStation')}
                </div>
                <div>
                  {label('Dropping Station')}
                  <input value={form.droppingStation} onChange={(e) => set('droppingStation', e.target.value)} placeholder="e.g. Mvan Terminal" className={inputCls('droppingStation')} />
                  {err('droppingStation')}
                </div>
              </div>
            </fieldset>

            {/* Schedule */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-teal-700 border-b border-teal-100 pb-1.5 w-full">Schedule</legend>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  {label('Departure Date')}
                  <input type="date" value={form.departureDate} onChange={(e) => set('departureDate', e.target.value)} className={inputCls('departureDate')} />
                  {err('departureDate')}
                </div>
                <div>
                  {label('Departure Time')}
                  <input type="time" value={form.departureTime} onChange={(e) => set('departureTime', e.target.value)} className={inputCls('departureTime')} />
                  {err('departureTime')}
                </div>
                <div>
                  {label('Est. Arrival Time')}
                  <input type="time" value={form.estimatedArrivalTime} onChange={(e) => set('estimatedArrivalTime', e.target.value)} className={inputCls('estimatedArrivalTime')} />
                  {err('estimatedArrivalTime')}
                </div>
              </div>
            </fieldset>

            {/* Bus & Operator */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-teal-700 border-b border-teal-100 pb-1.5 w-full">Bus & Operator</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Operator Name')}
                  <input value={form.operatorName} onChange={(e) => set('operatorName', e.target.value)} placeholder="e.g. Amour Mezam" className={inputCls('operatorName')} />
                  {err('operatorName')}
                </div>
                <div>
                  {label('Bus Code')}
                  <input value={form.busCode} onChange={(e) => set('busCode', e.target.value)} placeholder="e.g. BUS-001" className={inputCls('busCode')} />
                  {err('busCode')}
                </div>
                <div>
                  {label('Bus Plate Number')}
                  <input value={form.busPlate} onChange={(e) => set('busPlate', e.target.value)} placeholder="e.g. LT 4921 NW" className={inputCls('busPlate')} />
                  {err('busPlate')}
                </div>
                <div>
                  {label('Bus Type')}
                  <select value={form.busType} onChange={(e) => set('busType', e.target.value)} className={inputCls('busType')}>
                    {BUS_TYPES.map((b) => <option key={b.label}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  {label('Driver Name')}
                  <input value={form.driverName} onChange={(e) => set('driverName', e.target.value)} placeholder="Full name" className={inputCls('driverName')} />
                  {err('driverName')}
                </div>
                <div>
                  {label('Motor Boy Name')}
                  <input value={form.motorBoyName} onChange={(e) => set('motorBoyName', e.target.value)} placeholder="Full name" className={inputCls('motorBoyName')} />
                  {err('motorBoyName')}
                </div>
              </div>
            </fieldset>

            {/* Fare & Class */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-teal-700 border-b border-teal-100 pb-1.5 w-full">Fare & Class</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Journey Class')}
                  <select value={form.journeyClass} onChange={(e) => set('journeyClass', e.target.value)} className={inputCls('journeyClass')}>
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  {label('Price Per Seat (FCFA)')}
                  <input type="number" min="0" value={form.pricePerSeat} onChange={(e) => set('pricePerSeat', e.target.value)} placeholder="e.g. 5000" className={inputCls('pricePerSeat')} />
                  {err('pricePerSeat')}
                </div>
              </div>
            </fieldset>

            {/* Status & Amenities */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-teal-700 border-b border-teal-100 pb-1.5 w-full">Status & Amenities</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {label('Car Status')}
                  <select value={form.carStatus} onChange={(e) => set('carStatus', e.target.value)} className={inputCls('carStatus')}>
                    {CAR_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  {label('Journey Status')}
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls('status')}>
                    {JOURNEY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                {label('Amenities')}
                <div className="flex flex-wrap gap-3 mt-1">
                  {AMENITIES.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        className="accent-teal-700 w-4 h-4"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="journey-form"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Journey'}
          </button>
        </div>
      </div>
    </div>
  );
}
