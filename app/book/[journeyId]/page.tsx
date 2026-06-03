"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, User, ChevronDown } from 'lucide-react';
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
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [luggage, setLuggage] = useState<any>(null);
  const [boardingPoint, setBoardingPoint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getJourneyById(journeyId).then((j) => {
      setJourney(j);
      setBoardingPoint(j?.boardingStation || '');
    });
  }, [journeyId]);

  const seatCount = selectedSeats.length;
  const totalAmount = (journey?.pricePerSeat ?? 0) * seatCount;

  async function handlePassengerSubmit(data: any) {
    if (seatCount === 0) { alert('Please select at least one seat.'); return; }
    setSubmitting(true);
    try {
      const sharedRef = genRef();
      // Create one booking record per selected seat, same passenger info
      const ids: string[] = [];
      for (const seat of selectedSeats) {
        const id = await createBooking({
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
          seatNumber: seat,
          luggageSize: luggage?.size || 'No luggage',
          luggageTypes: luggage?.types || [],
          totalAmount: journey?.pricePerSeat ?? 0,
          paymentMethod: null,
          paymentStatus: 'pending',
          bookingReference: `${sharedRef}-${seat}`,
          boardingPoint: boardingPoint || journey?.boardingStation,
          droppingPoint: journey?.droppingStation,
        } as any);
        ids.push(id);
      }
      // Go to payment for the first booking; payment page handles the redirect
      router.push(`/payment/${ids[0]}`);
    } catch (e: any) {
      alert(e.message ?? 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const boardingOptions = journey
    ? [journey.boardingStation, journey.droppingStation].filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <BookingStepper activeStep={3} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT: Seat map + passenger form ── */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-3">
                Select your seat(s)
                {journey && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    — {journey.operatorName}
                  </span>
                )}
              </h2>
              <SeatMap
                journeyId={journeyId}
                onSelect={setSelectedSeats}
                selectedSeats={selectedSeats}
              />
            </div>

            {/* ── Passenger Details — single render, visible on all screens ── */}
            {seatCount > 0 && (
              <div
                id="passenger-section"
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-4"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-700" />
                    Passenger Details
                  </h3>
                  <span className="text-xs text-slate-400">All fields required to proceed</span>
                </div>
                <div className="p-6">
                  <PassengerForm onSubmit={handlePassengerSubmit} submitting={submitting} />
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <LuggageOptions onChange={(v: any) => setLuggage(v)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Summary panel (sticky) ── */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-4">

              {/* Journey info */}
              <div className="border-b border-slate-100">
                <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                  <span>OPERATOR INFO</span>
                  <span className="text-center">FROM – TO</span>
                  <span className="text-right">DATE AND TIME</span>
                </div>
                <div className="grid grid-cols-3 items-center px-4 py-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-700/10 border border-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 shrink-0">
                      {journey?.operatorName?.slice(0, 2).toUpperCase() || 'MB'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {journey?.operatorName || '—'}
                    </span>
                  </div>
                  <div className="text-center text-xs font-semibold text-slate-700">
                    {journey
                      ? `${journey.origin?.slice(0, 3).toUpperCase()} – ${journey.destination?.slice(0, 3).toUpperCase()}`
                      : '—'}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-800">{journey?.departureDate || '—'}</div>
                    <div className="text-xs text-teal-700 font-medium flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {journey?.departureTime || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Counts + total */}
              <div className="px-4 py-4 border-b border-slate-100 space-y-3">
                <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Selected Seats</span>
                  <span className="text-center">Total Amount</span>
                  <span className="text-right">Boarding Point</span>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-2xl font-extrabold text-slate-900">{seatCount}</span>
                  <span className="text-center text-xl font-extrabold text-slate-900">
                    {totalAmount.toLocaleString()}
                  </span>
                  <div className="relative">
                    <select
                      value={boardingPoint}
                      onChange={(e) => setBoardingPoint(e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 pr-6 outline-none appearance-none cursor-pointer hover:border-teal-300 focus:border-teal-500"
                    >
                      {boardingOptions.length > 0
                        ? boardingOptions.map((p: string) => <option key={p} value={p}>{p}</option>)
                        : <option value="">—</option>}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Selected seat chips */}
                {seatCount > 0 && (
                  <div className="flex items-start gap-1.5 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 flex-wrap">
                    <MapPin className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" />
                    <span className="text-xs text-teal-800 font-medium">
                      {selectedSeats
                        .slice()
                        .sort((a, b) => Number(a) - Number(b))
                        .map((s) => `Seat ${s}`)
                        .join(', ')}
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
                  disabled={seatCount === 0 || submitting}
                  onClick={() => {
                    if (seatCount === 0) { alert('Please select at least one seat.'); return; }
                    document.getElementById('passenger-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
