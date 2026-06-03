"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBookingById } from '../../../lib/firestore';
import Ticket from '../../../components/Ticket';

export default function ConfirmationPage({ params }: any) {
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState<any>(null);

  useEffect(()=>{
    getBookingById(bookingId).then(b=>{ setBooking(b); });
  },[bookingId]);

  if(!booking) return <div className="p-4">Loading confirmation...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Booking confirmed</h2>
      <Ticket booking={booking} />
      <p className="mt-4 text-sm text-slate-600">An SMS confirmation has been sent to {booking.passengerPhone}</p>
    </div>
  );
}
