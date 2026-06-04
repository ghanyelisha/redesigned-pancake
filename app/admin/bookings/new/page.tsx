"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, ChevronDown, CheckCircle2, Smartphone, Banknote, Phone } from 'lucide-react';
import SeatMap from '../../../../components/SeatMap';
import LuggageOptions from '../../../../components/LuggageOptions';
import { getAllJourneys } from '../../../../lib/adminFirestore';
import { createBooking } from '../../../../lib/firestore';
import { confirmBooking } from '../../../../lib/adminFirestore';
import type { Journey } from '../../../../lib/firestore';

function genRef() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors bg-white placeholder:text-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

type Step = 'journey' | 'seats' | 'passenger' | 'payment';

export default function AdminNewBookingPage() {
  const router = useRouter();

  // Step tracking
  const [step, setStep] = useState<Step>('journey');

  // Journey selection
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeySearch, setJourneySearch] = useState('');
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  // Seat selection
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [boardingPoint, setBoardingPoint] = useState('');

  // Passenger details
  const [passengerData, setPassengerData] = useState({
    name: '', surname: '', mobile: '', email: '', gender: 'Male', idType: 'National ID', idNumber: '',
  });
  const [passengerErrors, setPassengerErrors] = useState<Record<string, string>>({});

  // Luggage
  const [luggage, setLuggage] = useState<any>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money'>('cash');
  const [mobilePayPhone, setMobilePayPhone] = useState('');
  const [mobilePayService, setMobilePayService] = useState<'MTN' | 'ORANGE'>('MTN');

  // Idempotency: booking docs created only once; retries reuse these
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [awaitingUssd, setAwaitingUssd] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [createdRef, setCreatedRef] = useState('');

  useEffect(() => {
    getAllJourneys().then(setJourneys);
  }, []);

  const filteredJourneys = journeys.filter((j) => {
    const q = journeySearch.toLowerCase();
    return (
      !q ||
      j.origin?.toLowerCase().includes(q) ||
      j.destination?.toLowerCase().includes(q) ||
      j.operatorName?.toLowerCase().includes(q) ||
      j.departureDate?.includes(q)
    );
  });

  function validatePassenger() {
    const e: Record<string, string> = {};
    if (!passengerData.name.trim()) e.name = 'Required';
    if (!passengerData.surname.trim()) e.surname = 'Required';
    if (!passengerData.mobile.match(/^\+?\d{7,15}$/)) e.mobile = 'Enter a valid number';
    setPassengerErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!selectedJourney || selectedSeats.length === 0) return;
    if (!validatePassenger()) { setStep('passenger'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      // ── Phase 1: create booking docs exactly once ──────────────────────────
      // On retry after a timeout, pendingIds/pendingRef are already set —
      // skip creation entirely and reuse the same Firestore documents + reference.
      let ids = pendingIds;
      let sharedRef = pendingRef;

      if (!ids || !sharedRef) {
        sharedRef = genRef();
        ids = [];
        for (const seat of selectedSeats) {
          const id = await createBooking({
            journeyId: selectedJourney.id!,
            origin: selectedJourney.origin,
            destination: selectedJourney.destination,
            operatorName: selectedJourney.operatorName,
            departureDate: selectedJourney.departureDate,
            departureTime: selectedJourney.departureTime,
            passengerName: passengerData.name,
            passengerSurname: passengerData.surname,
            passengerPhone: passengerData.mobile,
            passengerEmail: passengerData.email,
            passengerGender: passengerData.gender,
            idType: passengerData.idType,
            idNumber: passengerData.idNumber,
            seatNumber: seat,
            luggageSize: luggage?.size || 'No luggage',
            luggageTypes: luggage?.types || [],
            totalAmount: selectedJourney.pricePerSeat ?? 0,
            paymentMethod: paymentMethod === 'cash' ? 'cash' : 'mobile_money',
            paymentStatus: 'pending',
            bookingReference: `${sharedRef}-${seat}`,
            boardingPoint: boardingPoint || selectedJourney.boardingStation,
            droppingPoint: selectedJourney.droppingStation,
          } as any);
          ids.push(id);
        }
        // Persist so any retry doesn't re-create these documents
        setPendingIds(ids);
        setPendingRef(sharedRef);
      }

      // ── Phase 2: fulfil payment ────────────────────────────────────────────
      if (paymentMethod === 'cash') {
        await Promise.all(ids.map((id) => confirmBooking(id)));
        setCreatedRef(sharedRef);
        setDone(true);
      } else {
        const phone = mobilePayPhone.replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
        setAwaitingUssd(true);
        let res: Response;
        try {
          res = await fetch('/api/payment/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: '+237' + phone,
              service: mobilePayService,
              // Same reference every retry — MeSomb deduplicates on their end
              amount: selectedJourney.pricePerSeat * selectedSeats.length,
              reference: sharedRef,
            }),
          });
        } finally {
          setAwaitingUssd(false);
        }
        const json = await res!.json();
        if (!res!.ok || json.status === 'FAILED') {
          throw new Error(json.message || 'Mobile money payment failed.');
        }
        await Promise.all(ids.map((id) => confirmBooking(id)));
        setCreatedRef(sharedRef);
        setDone(true);
      }
    } catch (e: any) {
      setSubmitError(e.message ?? 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Booking Created</h2>
          <p className="text-sm text-slate-500 mt-1">
            Reference: <span className="font-mono font-semibold text-slate-800">{createdRef}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedSeats.length} seat(s) · {paymentMethod === 'cash' ? 'Paid Cash' : 'Mobile Money'} · Confirmed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/bookings')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-teal-300 transition-colors"
          >
            View Bookings
          </button>
          <button
            onClick={() => { setDone(false); setStep('journey'); setSelectedJourney(null); setSelectedSeats([]); setPassengerData({ name:'',surname:'',mobile:'',email:'',gender:'Male',idType:'National ID',idNumber:'' }); setLuggage(null); setCreatedRef(''); }}
            className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors"
          >
            New Booking
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = (selectedJourney?.pricePerSeat ?? 0) * selectedSeats.length;
  const boardingOptions = selectedJourney
    ? [selectedJourney.boardingStation, selectedJourney.droppingStation].filter(Boolean)
    : [];

  const steps: { key: Step; label: string }[] = [
    { key: 'journey', label: 'Journey' },
    { key: 'seats', label: 'Seats' },
    { key: 'passenger', label: 'Passenger' },
    { key: 'payment', label: 'Payment' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Booking</h1>
          <p className="text-sm text-slate-500">Book any journey on behalf of a passenger</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const idx = steps.findIndex((x) => x.key === step);
          const done = i < idx;
          const active = s.key === step;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (done) setStep(s.key);
                }}
                disabled={!done}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'bg-teal-600 text-white' : done ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-white text-teal-700' : done ? 'bg-teal-200 text-teal-800' : 'bg-slate-300 text-slate-500'}`}>
                  {i + 1}
                </span>
                {s.label}
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Journey selection ── */}
      {step === 'journey' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Select a Journey</h2>
          <input
            value={journeySearch}
            onChange={(e) => setJourneySearch(e.target.value)}
            placeholder="Search by origin, destination, date…"
            className={inputCls}
          />
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredJourneys.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No journeys found.</p>
            )}
            {filteredJourneys.map((j) => (
              <button
                key={j.id}
                onClick={() => {
                  setSelectedJourney(j);
                  setBoardingPoint(j.boardingStation || '');
                  setSelectedSeats([]);
                  // Changing journey invalidates any previously created booking docs
                  setPendingIds(null);
                  setPendingRef(null);
                  setStep('seats');
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedJourney?.id === j.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {j.origin} → {j.destination}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {j.operatorName} · {j.departureDate} at {j.departureTime} · {j.journeyClass} · {j.busType}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-teal-700 shrink-0">
                    {(j.pricePerSeat ?? 0).toLocaleString()} FCFA
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Seat selection ── */}
      {step === 'seats' && selectedJourney && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-800">
                {selectedJourney.origin} → {selectedJourney.destination}
              </p>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedJourney.departureDate} {selectedJourney.departureTime}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{selectedJourney.operatorName} · {selectedJourney.pricePerSeat?.toLocaleString()} FCFA/seat</p>
            <SeatMap
              journeyId={selectedJourney.id!}
              onSelect={setSelectedSeats}
              selectedSeats={selectedSeats}
            />
          </div>

          {/* Boarding point + summary */}
          {selectedSeats.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-700" />
                <span className="text-sm font-semibold text-slate-800">Boarding Point</span>
              </div>
              <div className="relative">
                <select
                  value={boardingPoint}
                  onChange={(e) => setBoardingPoint(e.target.value)}
                  className={inputCls + ' appearance-none pr-8'}
                >
                  {boardingOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {selectedSeats.length} seat(s) selected: {selectedSeats.sort((a,b)=>Number(a)-Number(b)).map(s=>`Seat ${s}`).join(', ')}
                </span>
                <span className="font-bold text-slate-900">{totalAmount.toLocaleString()} FCFA</span>
              </div>
              <button
                onClick={() => setStep('passenger')}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Continue to Passenger Details
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Passenger details ── */}
      {step === 'passenger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Passenger Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First Name</label>
              <input value={passengerData.name} onChange={(e) => setPassengerData(p => ({ ...p, name: e.target.value }))} placeholder="First name" className={inputCls} />
              {passengerErrors.name && <p className="text-xs text-red-500 mt-1">{passengerErrors.name}</p>}
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input value={passengerData.surname} onChange={(e) => setPassengerData(p => ({ ...p, surname: e.target.value }))} placeholder="Last name" className={inputCls} />
              {passengerErrors.surname && <p className="text-xs text-red-500 mt-1">{passengerErrors.surname}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mobile Number</label>
              <input value={passengerData.mobile} onChange={(e) => setPassengerData(p => ({ ...p, mobile: e.target.value }))} placeholder="+237 6 XX XX XX XX" className={inputCls} />
              {passengerErrors.mobile && <p className="text-xs text-red-500 mt-1">{passengerErrors.mobile}</p>}
            </div>
            <div>
              <label className={labelCls}>Email (optional)</label>
              <input value={passengerData.email} onChange={(e) => setPassengerData(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select value={passengerData.gender} onChange={(e) => setPassengerData(p => ({ ...p, gender: e.target.value }))} className={inputCls}>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ID Type</label>
              <select value={passengerData.idType} onChange={(e) => setPassengerData(p => ({ ...p, idType: e.target.value }))} className={inputCls}>
                <option>National ID</option>
                <option>Passport</option>
                <option>Birth Certificate</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>ID Number</label>
              <input value={passengerData.idNumber} onChange={(e) => setPassengerData(p => ({ ...p, idNumber: e.target.value }))} placeholder="ID number" className={inputCls} />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <LuggageOptions onChange={setLuggage} />
          </div>
          <button
            onClick={() => {
              if (validatePassenger()) {
                // Pre-fill the mobile money phone from the passenger's number
                if (passengerData.mobile) {
                  const stripped = passengerData.mobile.replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
                  setMobilePayPhone(stripped);
                }
                setStep('payment');
              }
            }}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {/* ── Step 4: Payment method ── */}
      {step === 'payment' && selectedJourney && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-sm space-y-1">
            <p className="font-semibold text-slate-800">{selectedJourney.origin} → {selectedJourney.destination}</p>
            <p className="text-slate-500">{passengerData.name} {passengerData.surname} · {selectedSeats.length} seat(s): {selectedSeats.sort((a,b)=>Number(a)-Number(b)).map(s=>`Seat ${s}`).join(', ')}</p>
            <p className="font-bold text-slate-900">{totalAmount.toLocaleString()} FCFA total</p>
          </div>

          {/* Payment method selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Payment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-colors text-sm font-semibold ${
                  paymentMethod === 'cash' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Banknote className="h-6 w-6" />
                Paid Cash
              </button>
              <button
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-colors text-sm font-semibold ${
                  paymentMethod === 'mobile_money' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Smartphone className="h-6 w-6" />
                Mobile Money
              </button>
            </div>

            {/* Mobile money fields */}
            {paymentMethod === 'mobile_money' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className={labelCls}>Mobile Money Number</label>
                  <div className="flex">
                    <span className="px-3 py-2 text-sm bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 font-medium">🇨🇲 +237</span>
                    <input
                      value={mobilePayPhone}
                      onChange={(e) => setMobilePayPhone(e.target.value)}
                      placeholder="6 XX XX XX XX"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-r-lg outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Network</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['MTN', 'ORANGE'] as const).map((svc) => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => setMobilePayService(svc)}
                        className={`py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                          mobilePayService === svc ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {svc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USSD waiting banner — shown while API call is in flight */}
            {awaitingUssd && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">
                    Waiting for payment approval on the customer&apos;s phone…
                  </p>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  A USSD prompt has been sent to <span className="font-semibold">+237 {mobilePayPhone}</span>. Ask the customer to approve it on their phone.
                </p>
                <div className="rounded-lg bg-amber-100 border border-amber-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    If the popup doesn&apos;t appear, ask them to dial:
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold text-amber-900 bg-white border border-amber-300 rounded px-2 py-1">
                      *126# <span className="text-[10px] font-normal text-amber-600 ml-1">MTN</span>
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-900 bg-white border border-amber-300 rounded px-2 py-1">
                      #150*50# <span className="text-[10px] font-normal text-amber-600 ml-1">ORANGE</span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-600">Do not close this page — confirmation is automatic once approved.</p>
              </div>
            )}

            {submitError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3 space-y-2">
                <p className="font-semibold">{submitError}</p>
                {paymentMethod === 'mobile_money' && (
                  <p className="text-red-500">
                    Ask the customer to dial <span className="font-mono font-semibold">*126#</span> (MTN) or <span className="font-mono font-semibold">#150*50#</span> (ORANGE) to complete any pending approval, then retry.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || (paymentMethod === 'mobile_money' && !mobilePayPhone.trim())}
              className="w-full bg-[#1e3a8a] hover:bg-blue-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {paymentMethod === 'cash' ? 'Confirming…' : 'Sending payment request…'}
                </span>
              ) : paymentMethod === 'cash' ? (
                `Confirm Booking · ${totalAmount.toLocaleString()} FCFA Cash`
              ) : (
                `Collect ${totalAmount.toLocaleString()} FCFA via ${mobilePayService}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
