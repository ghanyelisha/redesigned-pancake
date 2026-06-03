"use client";
import { useEffect, useState } from "react";
import { getBookingById, getJourneyById } from "../../../lib/firestore";
import Ticket from "../../../components/Ticket";

export default function ConfirmationPage({ params }: any) {
  const bookingId = params.bookingId;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const booking = await getBookingById(bookingId);
      if (!booking) return;
      const journey = await getJourneyById(booking.journeyId);
      setData({ ...booking, ...journey, id: bookingId });
    })();
  }, [bookingId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500 animate-pulse">Preparing your ticket…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0f766e] mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Booking Confirmed!</h1>
        <p className="text-slate-500 text-sm mt-1">
          Your ticket is downloading automatically. You can also download it below.
        </p>
      </div>

      <Ticket booking={data} autoDownload />

      {data.passengerPhone && (
        <p className="mt-6 text-xs text-slate-400 text-center">
          An SMS confirmation has been sent to {data.passengerPhone}
        </p>
      )}
    </div>
  );
}
