"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MapPin, Clock, User } from 'lucide-react';
import SeatMap from '../../../components/SeatMap';
import PassengerForm from '../../../components/PassengerForm';
import LuggageOptions from '../../../components/LuggageOptions';
import BookingStepper from '../../../components/BookingStepper';
import { getJourneyById, createBooking } from '../../../lib/firestore';

function genRef() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function BookPage({ params }: any) {
  const journeyId = params.journeyId;
  const router = useRouter();
  const [journey, setJourney] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [passData, setPassData] = useState<any>(null);
  const [luggage, setLuggage] = useState<any>(null);
  const [boardingPoint, setBoardingPoint] = useState('');
  const [showPassengerForm, setShowPassengerForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getJourneyById(journeyId).then((j) => {
      setJourney(j);
      setBoardingPoint(j?.boardingStation || '');
    });
  }, [journeyId]);

  async function handlePassengerSubmit(data: any) {
    if (!selectedSeat) { alert('Please select a seat first.'); return; }
    setSubmitting(true);
    const bookingRef = genRef();
    const booking = {
      journeyId,
      origin: journey?.origin,
      destination: journey?.destination,
      operatorName: journey?.operatorName,
      departureDate: journey?.departureDate,
      departureTime: journey?.departureTime,
      passengerName: data.name,
      passengerSurname: data.surname,
      passengerPhone: data.mobile,
      passengerEmail: data.email,
      passengerGender: data.gender,
      idType: data.idType,
      idNumber: data.idNumber,
      seatNumber: selectedSeat,
      luggageSize: luggage?.size || 'No luggage',
      luggageTypes: luggage?.types || [],
      totalAmount: journey?.pricePerSeat || 0,
      paymentMethod: null,
      paymentStatus: 'pending',
      bookingReference: bookingRef,
      boardingPoint: boardingPoint || journey?.boardingStation,
      droppingPoint: journey?.droppingStation,
    } as any;
    const id = await createBooking(booking);
    router.push(`/payment/${id}`);
  }

  const boardingOptions = journey
    ? [journey.boardingStation, journey.droppingStation].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <BookingStepper activeStep={3} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Seat Map ── */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 mb-3">
              Select your seat
              {journey && (
                <span className="ml-2 text-sm font-normal text-slate-500">— {journey.operatorName}</span>
              )}
            </h2>
            <SeatMap
              journeyId={journeyId}
              onSelect={(s) => { setSelectedSeat(s); setShowPassengerForm(false); }}
              selectedSeat={selectedSeat}
            />

            {/* Passenger & Luggage — shown below seat map on mobile, toggled */}
            {selectedSeat && (
              <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowPassengerForm(!showPassengerForm)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-700" />
                    Passenger Details
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showPassengerForm ? 'rotate-180' : ''}`} />
                </button>
                {showPassengerForm && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <PassengerForm onSubmit={handlePassengerSubmit} />
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <LuggageOptions onChange={(v: any) => setLuggage(v)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Summary panel ── */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">

              {/* Journey info table */}
              <div className="border-b border-slate-100">
                <div className="grid grid-cols-3 text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <span>Operator Info</span>
                  <span className="text-center">From – To</span>
                  <span className="text-right">Date and Time</span>
                </div>
                <div className="grid grid-cols-3 items-center px-4 py-4 gap-2">
                  {/* Operator */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-700/10 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 shrink-0">
                      {journey?.operatorName?.slice(0, 2).toUpperCase() || 'MB'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {journey?.operatorName || '—'}
                    </span>
                  </div>
                  {/* Route */}
                  <div className="text-center text-xs font-semibold text-slate-700">
                    {journey
                      ? `${journey.origin?.slice(0, 3).toUpperCase()} – ${journey.destination?.slice(0, 3).toUpperCase()}`
                      : '—'}
                  </div>
                  {/* Date/time */}
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-800">
                      {journey?.departureDate || '—'}
                    </div>
                    <div className="text-xs text-teal-700 font-medium flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {journey?.departureTime || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="px-4 py-4 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-2">
                  <span className="font-semibold">Selected Seats</span>
                  <span className="text-center font-semibold">Total Amount</span>
                  <span className="text-right font-semibold">Boarding Point</span>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-2xl font-extrabold text-slate-900">{selectedSeat ? 1 : 0}</span>
                  <span className="text-center text-2xl font-extrabold text-slate-900">
                    {journey ? (journey.pricePerSeat * (selectedSeat ? 1 : 0)).toLocaleString() : '0'}
                  </span>
                  {/* Boarding point dropdown */}
                  <div className="relative">
                    <select
                      value={boardingPoint}
                      onChange={(e) => setBoardingPoint(e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 pr-6 outline-none appearance-none cursor-pointer hover:border-teal-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    >
                      {boardingOptions.length > 0
                        ? boardingOptions.map((p: string) => <option key={p} value={p}>{p}</option>)
                        : <option value="">Select point</option>
                      }
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {selectedSeat && (
                  <div className="mt-3 flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                    <MapPin className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                    <span className="text-xs text-teal-800">
                      Seat <strong>{selectedSeat}</strong> selected
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => router.back()}
                  className="flex-1 border-2 border-teal-700 text-teal-700 hover:bg-teal-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  disabled={!selectedSeat || submitting}
                  onClick={() => {
                    if (!selectedSeat) { alert('Please select a seat first.'); return; }
                    setShowPassengerForm(true);
                    // scroll to form on mobile
                    document.getElementById('passenger-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {submitting ? 'Processing…' : 'NEXT'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger form anchor for mobile scroll */}
        <div id="passenger-form-anchor" />

        {/* On desktop: show passenger form below seat map in a card when seat selected */}
        {selectedSeat && (
          <div className="mt-6 hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-teal-700" />
                Passenger Details
                <span className="ml-auto text-xs text-slate-400 font-normal">All fields required to proceed</span>
              </h3>
            </div>
            <div className="p-6">
              <PassengerForm onSubmit={handlePassengerSubmit} />
              <div className="mt-5 pt-5 border-t border-slate-100">
                <LuggageOptions onChange={(v: any) => setLuggage(v)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
