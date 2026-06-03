"use client";
import React, { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface TicketProps {
  booking: {
    bookingReference: string;
    passengerName: string;
    passengerSurname: string;
    passengerGender?: string;
    seatNumber: string;
    origin?: string;
    destination?: string;
    journeyDate?: string;
    departureTime?: string;
    estimatedArrivalTime?: string;
    operatorName?: string;
    journeyClass?: string;
    boardingPoint?: string;
    droppingPoint?: string;
    totalAmount?: number;
    passengerPhone?: string;
  };
  /** If true the component auto-triggers a PDF download on mount */
  autoDownload?: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(date?: string) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}-${m}-${y}`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function Ticket({ booking, autoDownload }: TicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const hasDownloaded = useRef(false);

  const qrValue = `MYBUS:${booking.bookingReference}:${booking.seatNumber}`;
  const passengerLabel =
    `${booking.passengerName} ${booking.passengerSurname}`.toUpperCase() +
    (booking.passengerGender ? `  ${booking.passengerGender.toUpperCase()}` : "");

  const downloadPDF = useCallback(async () => {
    if (!ticketRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(ticketRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pxW = canvas.width;
    const pxH = canvas.height;

    // Keep aspect ratio, fit to A5 portrait width (148 mm)
    const pdfW = 148;
    const pdfH = (pxH / pxW) * pdfW;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] });
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`MyBus-${booking.bookingReference}.pdf`);
  }, [booking.bookingReference]);

  /* auto-download once on mount when flag is set */
  React.useEffect(() => {
    if (autoDownload && !hasDownloaded.current) {
      hasDownloaded.current = true;
      // small delay to allow SVGs to paint
      const t = setTimeout(downloadPDF, 800);
      return () => clearTimeout(t);
    }
  }, [autoDownload, downloadPDF]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── Printable / capturable ticket ──────────────────────────────── */}
      <div
        ref={ticketRef}
        style={{ width: 360, fontFamily: "'DM Sans', system-ui, sans-serif" }}
        className="bg-white shadow-xl rounded-2xl overflow-hidden select-none"
      >
        {/* ── HEADER BAND ──────────────────────────────────────────────── */}
        <div className="bg-[#0f766e] px-5 pt-5 pb-4">
          {/* Logo row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Bus icon inline SVG so html2canvas captures it */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span className="text-white text-xl font-bold tracking-wide">MyBus</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-teal-100 uppercase tracking-widest">Ticket type</div>
              <div className="text-white text-xs font-semibold">ONE-WAY</div>
            </div>
          </div>

          {/* BOARDING PASS label */}
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] text-teal-200 uppercase tracking-widest">Boarding Pass</div>
              <div className="text-white font-bold text-lg leading-tight">{passengerLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-teal-200 uppercase tracking-widest">Class</div>
              <div className="text-white text-sm font-semibold">{booking.journeyClass ?? "Classic"}</div>
            </div>
          </div>
        </div>

        {/* ── ROUTE SECTION ─────────────────────────────────────────────── */}
        <div className="px-5 py-4 bg-white">
          <div className="flex items-start justify-between gap-2">
            {/* Origin */}
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">From</div>
              <div className="text-slate-800 font-bold text-base leading-tight">{booking.origin ?? "—"}</div>
              {booking.boardingPoint && (
                <div className="text-[10px] text-slate-500 mt-0.5">{booking.boardingPoint}</div>
              )}
            </div>

            {/* Arrow */}
            <div className="mt-3 flex-shrink-0">
              <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                <path d="M1 6h18M14 1l5 5-5 5" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Destination */}
            <div className="flex-1 text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">To</div>
              <div className="text-slate-800 font-bold text-base leading-tight">{booking.destination ?? "—"}</div>
              {booking.droppingPoint && (
                <div className="text-[10px] text-slate-500 mt-0.5">{booking.droppingPoint}</div>
              )}
            </div>
          </div>

          {/* Date / Times / Seat row */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Date</div>
              <div className="text-slate-700 font-semibold text-sm">{fmt(booking.journeyDate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Departs</div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0f766e] inline-block" />
                <span className="text-slate-700 font-semibold text-sm">{booking.departureTime ?? "—"}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Arrives</div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                <span className="text-slate-700 font-semibold text-sm">{booking.estimatedArrivalTime ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Fare base / Operator / Seat */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Seat</div>
              <div className="text-[#0f766e] font-black text-2xl">{booking.seatNumber}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Fare base</div>
              <div className="text-slate-700 font-semibold text-sm">Adult</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Issued by</div>
              <div className="text-slate-700 font-semibold text-sm leading-tight">{booking.operatorName ?? "MyBus"}</div>
            </div>
          </div>

          {/* Reference + QR Code */}
          <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">Ticket number</div>
              <div className="text-slate-700 font-mono font-semibold text-sm">{booking.bookingReference}</div>
              <div className="mt-3 text-[10px] text-slate-400 uppercase tracking-widest">Seat</div>
              <div className="text-[#0f766e] font-black text-2xl">{booking.seatNumber}</div>
            </div>
            <QRCodeSVG value={qrValue} size={80} fgColor="#0f766e" />
          </div>
        </div>

        {/* ── TEAR LINE ─────────────────────────────────────────────────── */}
        <div className="relative flex items-center px-3 py-1 bg-slate-50">
          {/* left notch */}
          <div className="absolute -left-3 w-6 h-6 rounded-full bg-white border border-slate-200" />
          <div
            className="flex-1 border-t-2 border-dashed border-slate-300 mx-4"
            style={{ borderSpacing: "8px" }}
          />
          {/* right notch */}
          <div className="absolute -right-3 w-6 h-6 rounded-full bg-white border border-slate-200" />
        </div>

        {/* ── STUB (bottom third — torn at boarding) ────────────────────── */}
        <div className="bg-slate-50 px-5 py-4">
          <div className="text-[9px] text-slate-400 uppercase tracking-widest text-center mb-3">
            Boarding Stub — Present at gate
          </div>
          <div className="flex items-center justify-between gap-4">
            {/* Stub QR */}
            <QRCodeSVG value={qrValue} size={72} fgColor="#334155" />

            {/* Stub info */}
            <div className="flex-1 space-y-1.5">
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Passenger</div>
                <div className="text-slate-700 font-semibold text-xs leading-tight">{passengerLabel}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-widest">Seat</div>
                  <div className="text-[#0f766e] font-black text-lg">{booking.seatNumber}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-widest">Date</div>
                  <div className="text-slate-700 font-semibold text-xs">{fmt(booking.journeyDate)}</div>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">Ticket #</div>
                <div className="text-slate-600 font-mono text-[10px]">{booking.bookingReference}</div>
              </div>
            </div>
          </div>

          {/* Fine print */}
          <div className="mt-3 text-[8px] text-slate-400 text-center leading-relaxed">
            Check-in counter closes 15 minutes before departure
          </div>
        </div>
      </div>

      {/* ── Download button ──────────────────────────────────────────────── */}
      <button
        onClick={downloadPDF}
        className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0d5c56] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Ticket (PDF)
      </button>
    </div>
  );
}
