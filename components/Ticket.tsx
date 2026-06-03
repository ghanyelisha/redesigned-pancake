"use client";
import React from 'react';

export default function Ticket({ booking }: any) {
  return (
    <div className="p-6 border rounded-lg bg-white max-w-xl mx-auto">
      <div className="text-center text-2xl font-bold">MyBus</div>
      <div className="mt-4 border p-4 rounded">
        <div className="flex justify-between"><div>Reference</div><div className="font-bold">{booking.bookingReference}</div></div>
        <div className="flex justify-between"><div>Passenger</div><div>{booking.passengerName} {booking.passengerSurname}</div></div>
        <div className="flex justify-between"><div>Route</div><div>{booking.origin} - {booking.destination}</div></div>
        <div className="flex justify-between"><div>Seat</div><div>{booking.seatNumber}</div></div>
        <div className="flex justify-between"><div>Date</div><div>{booking.journeyDate}</div></div>
      </div>
      <div className="mt-4 text-center">
        <button onClick={()=>window.print()} className="bg-blue-900 text-white px-4 py-2 rounded">Print Ticket</button>
      </div>
    </div>
  );
}
