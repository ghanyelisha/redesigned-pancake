"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getBookingById, listenBooking } from '../../../lib/firestore';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import PaymentMethods from '../../../components/PaymentMethods';

export default function PaymentPage({ params }: any) {
  const bookingId = params.bookingId;
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [method, setMethod] = useState('MoMo');
  const [secondsLeft, setSecondsLeft] = useState(15*60);
  const intervalRef = useRef<any>(null);

  useEffect(()=>{
    getBookingById(bookingId).then(b=>{ setBooking(b); });
    const unsub = listenBooking(bookingId, (b)=>{ if(b) setBooking(b); if(b?.paymentStatus==='confirmed'){ router.push(`/confirmation/${bookingId}`); } });
    return ()=> unsub();
  },[bookingId]);

  useEffect(()=>{
    intervalRef.current = setInterval(()=>{
      setSecondsLeft((s)=>{
        if (s<=1){
          clearInterval(intervalRef.current);
          // release and redirect to search
          if (booking) {
            // mark booking failed
            // mark booking failed
            const ref = doc(db,'bookings', bookingId);
            updateDoc(ref, { paymentStatus: 'failed' }).catch(()=>{});
          }
          router.push('/search');
          return 0;
        }
        return s-1;
      });
    },1000);
    return ()=> clearInterval(intervalRef.current);
  },[bookingId, booking]);

  function formatSeconds(s:number){
    const mm = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${mm}:${ss}`;
  }

  async function handlePayNow(){
    if(!booking) return;
    // write pending payment doc (simple update)
    const ref = doc(db,'bookings', bookingId);
    await updateDoc(ref, { paymentMethod: method, paymentStatus: 'pending' });
    // show spinner then wait for admin to set confirmed
    alert('Payment initiated (simulated). Waiting for admin confirmation.');
  }

  if(!booking) return <div className="p-4">Loading booking...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Waiting for payment</h2>
      <div className="border p-4 rounded mb-4">
        <div className="text-center border-red-500 rounded p-2 inline-block font-bold text-red-700">{formatSeconds(secondsLeft)}</div>
        <div className="mt-4">
          <div>Operator: {booking.operatorName || booking.operator}</div>
          <div>Coach: {booking.coach || booking.journeyId}</div>
          <div>Journey Date: {booking.journeyDate || booking.departureDate}</div>
          <div>Route: {booking.origin} - {booking.destination}</div>
          <div>Boarding Point: {booking.boardingPoint}</div>
          <div>Dropping Point: {booking.droppingPoint}</div>
          <div>Seat No.: {booking.seatNumber}</div>
          <div>Departure Time: {booking.departureTime}</div>
        </div>
      </div>

      <div className="text-xl font-bold mb-4">Total Price: FCFA {booking.totalAmount}</div>

      <PaymentMethods onSelect={(m:any)=>setMethod(m)} />

      <div className="mt-6">
        <button onClick={handlePayNow} className="w-full bg-blue-900 text-white py-3 rounded-full">Pay Now</button>
      </div>
    </div>
  );
}
