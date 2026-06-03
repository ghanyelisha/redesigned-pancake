"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SeatMap from '../../../../components/SeatMap';
import PassengerForm from '../../../../components/PassengerForm';
import LuggageOptions from '../../../../components/LuggageOptions';
import { getJourneyById, createBooking } from '../../../../lib/firestore';

function genRef() {
  return Math.random().toString(36).substring(2,10).toUpperCase();
}

export default function BookPage({ params }: any) {
  const journeyId = params.journeyId;
  const router = useRouter();
  const [journey, setJourney] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [passData, setPassData] = useState<any>(null);
  const [luggage, setLuggage] = useState<any>(null);

  useEffect(()=>{
    getJourneyById(journeyId).then(j=>setJourney(j));
  },[journeyId]);

  async function handlePassengerSubmit(data: any) {
    setPassData(data);
    // create booking with pending status and redirect to payment
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
      boardingPoint: journey?.boardingStation,
      droppingPoint: journey?.droppingStation,
    } as any;
    const id = await createBooking(booking);
    router.push(`/payment/${id}`);
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Select Seat — {journey?.operatorName}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <SeatMap journeyId={journeyId} onSelect={(s:any)=>setSelectedSeat(s)} />
        </div>
        <div className="md:col-span-1 bg-white p-4 rounded">
          <div className="mb-3">Selected Seat: <strong>{selectedSeat || 'None'}</strong></div>
          {selectedSeat && <PassengerForm onSubmit={handlePassengerSubmit} />}
          <div className="mt-4">
            <LuggageOptions onChange={(v:any)=>setLuggage(v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
