"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Shield, Phone, CheckCircle, XCircle,
  Loader2, MapPin, Calendar, User, Ticket,
} from 'lucide-react';
import { getBookingById, listenBooking } from '../../../lib/firestore';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import BookingStepper from '../../../components/BookingStepper';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceId = 'MTN' | 'ORANGE_USSD' | 'ORANGE_WEB';
type MesombService = 'MTN' | 'ORANGE';
type PayState = 'idle' | 'loading' | 'success' | 'error';

interface ServiceOption {
  id: ServiceId;
  name: string;
  sub: string;
  bg: string;
  textColor: string;
  logo: string;
  mesombService: MesombService;
}

const SERVICES: ServiceOption[] = [
  {
    id: 'MTN',
    name: 'MTN MoMo',
    sub: 'MTN Mobile Money — USSD Push',
    bg: 'bg-yellow-400',
    textColor: 'text-yellow-900',
    logo: 'M',
    mesombService: 'MTN',
  },
  {
    id: 'ORANGE_USSD',
    name: 'Orange USSD',
    sub: 'Orange Money — USSD Push',
    bg: 'bg-orange-500',
    textColor: 'text-white',
    logo: 'O',
    mesombService: 'ORANGE',
  },
  {
    id: 'ORANGE_WEB',
    name: 'Orange Web',
    sub: 'Orange Money — Web Payment',
    bg: 'bg-orange-600',
    textColor: 'text-white',
    logo: 'OW',
    mesombService: 'ORANGE',
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentPage({ params }: any) {
  const bookingId = params.bookingId;
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [service, setService] = useState<ServiceId | null>(null);
  const [phone, setPhone] = useState('');
  const [payState, setPayState] = useState<PayState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load booking + listen for status changes ──────────────────────────────
  useEffect(() => {
    getBookingById(bookingId).then((b) => {
      setBooking(b);
      // Pre-fill the phone input from the passenger's number collected at booking
      if (b?.passengerPhone) {
        const stripped = String(b.passengerPhone).replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
        if (/^6\d{8}$/.test(stripped)) setPhone(stripped);
      }
    });
    const unsub = listenBooking(bookingId, (b) => {
      if (b) setBooking(b);
      if (b?.paymentStatus === 'confirmed') {
        router.push(`/confirmation/${bookingId}`);
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ── 15-minute countdown (seat hold) ──────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          // Mark expired and redirect to search with a message
          runTransaction(db, async (tx) => {
            const bookingRef = doc(db, 'bookings', bookingId);
            tx.update(bookingRef, { paymentStatus: 'expired' });
          }).catch(() => {});
          router.push('/search?expired=1');
          return 0;
        }
        return s - 1;
      });
    }, 1_000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  function fmtTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── Validate Cameroonian phone ────────────────────────────────────────────
  function cleanPhone(raw: string): string | null {
    const stripped = raw.replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
    return /^6\d{8}$/.test(stripped) ? stripped : null;
  }

  // ── Pay handler ───────────────────────────────────────────────────────────
  async function handlePay() {
    setErrorMsg('');
    if (!service) { setErrorMsg('Please select a payment method.'); return; }
    const cleaned = cleanPhone(phone);
    if (!cleaned) {
      setErrorMsg('Enter a valid Cameroon number (e.g. 670 00 00 00)');
      return;
    }

    const chosenSvc = SERVICES.find((s) => s.id === service)!;
    setPayState('loading');

    try {
      // Update Firestore with selected method before calling MeSomb
      await updateDoc(doc(db, 'bookings', bookingId), {
        paymentMethod: service,
        paymentStatus: 'pending',
      });

      const res = await fetch('/api/payment/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          phone: cleaned,
          service: chosenSvc.mesombService,
          amount: booking.totalAmount,
          reference: booking.bookingReference,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          paymentStatus: 'confirmed',
          paymentMethod: service,
          mesombTransactionPk: data.transactionPk ?? null,
          mesombFinTrxId: data.finTrxId ?? null,
          confirmedAt: serverTimestamp(),
        });
        setPayState('success');
        setTimeout(() => router.push(`/confirmation/${bookingId}`), 1_500);
      } else {
        setPayState('error');
        setErrorMsg(data.message ?? 'Payment was not completed. Please try again.');
      }
    } catch (e: any) {
      setPayState('error');
      setErrorMsg(e.message ?? 'Network error. Please check your connection and try again.');
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const urgent = secondsLeft <= 120;
  const isLoading = payState === 'loading';
  const isSuccess = payState === 'success';
  const chosenSvc = service ? SERVICES.find((s) => s.id === service) : null;
  const canPay = service !== null && phone.trim().length >= 8;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <BookingStepper activeStep={4} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* ── Seat-hold countdown — always red-bordered ── */}
        <div
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold border-2 border-red-400 ${
            urgent ? 'bg-red-50 text-red-700' : 'bg-white text-red-600'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          Seat held for{' '}
          <span className="font-mono text-base tracking-widest">
            {fmtTime(secondsLeft)}
          </span>
          {urgent && ' — complete payment NOW!'}
        </div>

        {/* ── Booking summary card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-800">Booking Summary</h2>
          </div>

          <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Operator</p>
              <p className="font-semibold text-slate-800">{booking.operatorName ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Coach</p>
              <p className="font-semibold text-slate-800">{booking.busCode ?? '—'} · {booking.journeyClass ?? booking.operatorClass ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Route</p>
              <p className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-teal-600" />
                {booking.origin} → {booking.destination}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Journey Date</p>
              <p className="text-slate-700 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                {booking.departureDate ? (() => { const [y,m,d] = booking.departureDate.split('-'); return `${d}-${m}-${y}`; })() : '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Boarding Point</p>
              <p className="text-slate-700 text-xs">{booking.boardingPoint ?? '—'} <span className="text-teal-600 font-semibold">{booking.departureTime ?? ''}</span></p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dropping Point</p>
              <p className="text-slate-700 text-xs">{booking.droppingPoint ?? '—'} <span className="text-slate-500">{booking.estimatedArrivalTime ?? ''}</span></p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Passenger</p>
              <p className="text-slate-700 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" />
                {booking.passengerName} {booking.passengerSurname}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Seat No.</p>
              <p className="font-bold text-teal-700 text-base">{booking.seatNumber}</p>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Booking Reference</p>
              <p className="font-mono text-xs text-slate-600">{booking.bookingReference}</p>
            </div>
          </div>

          {/* Amount strip */}
          <div className="px-6 py-4 bg-teal-700 text-white flex items-center justify-between">
            <span className="text-sm font-semibold opacity-80">Total Amount Due</span>
            <span className="text-2xl font-extrabold tracking-tight">
              FCFA {(booking.totalAmount ?? 0).toLocaleString('fr-FR')}
            </span>
          </div>
        </div>

        {/* ── Payment section ── */}
        {isSuccess ? (
          <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-teal-700" />
            </div>
            <p className="text-lg font-bold text-teal-800">Payment Successful!</p>
            <p className="text-sm text-slate-500">
              FCFA {(booking.totalAmount ?? 0).toLocaleString('fr-FR')} received via {chosenSvc?.name ?? service}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirecting to your ticket…
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Select Payment Method</h3>
            </div>

            <div className="p-6 space-y-5">
              {/* ── 3 Payment method cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setService(s.id); setErrorMsg(''); }}
                    disabled={isLoading}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                      service === s.id
                        ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } disabled:opacity-50`}
                  >
                    <div className={`w-12 h-12 rounded-full ${s.bg} flex items-center justify-center shadow-sm shrink-0`}>
                      <span className={`text-sm font-black ${s.textColor}`}>{s.logo}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                    </div>
                    {service === s.id && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* ── Phone number (shown after method selected) ── */}
              {service && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {chosenSvc?.name} Phone Number
                  </label>
                  <div className={`flex items-center border rounded-xl overflow-hidden transition-colors ${
                    errorMsg ? 'border-red-400' : 'border-slate-200 focus-within:border-teal-500'
                  }`}>
                    <span className="px-3 py-3.5 bg-slate-50 border-r border-slate-200 text-sm font-semibold text-slate-600 shrink-0">
                      🇨🇲 +237
                    </span>
                    <div className="flex items-center flex-1 px-3 gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setErrorMsg(''); if (payState === 'error') setPayState('idle'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePay(); }}
                        placeholder="6 XX XX XX XX"
                        disabled={isLoading}
                        className="flex-1 py-3.5 text-sm outline-none bg-transparent placeholder:text-slate-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {errorMsg}
                    </p>
                  )}
                </div>
              )}

              {/* ── USSD info notice ── */}
              {service && !isLoading && (
                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-600">
                  <Shield className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    A USSD push notification will be sent to <strong>+237 {phone || '…'}</strong>. Open it on your phone and enter your {chosenSvc?.name} PIN to confirm. You have <strong>60 seconds</strong> to approve.
                  </span>
                </div>
              )}

              {/* ── Waiting spinner ── */}
              {isLoading && chosenSvc && (
                <div className="flex flex-col items-center gap-3 py-5 text-center">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full ${chosenSvc.bg} flex items-center justify-center shadow-md`}>
                      <span className={`text-xl font-black ${chosenSvc.textColor}`}>{chosenSvc.logo}</span>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Waiting for your approval…</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Check your phone (+237 {phone}) and approve the {chosenSvc.name} request
                    </p>
                  </div>
                </div>
              )}

              {/* ── Pay Now button ── */}
              {!isLoading && (
                <button
                  onClick={handlePay}
                  disabled={!canPay}
                  className="w-full bg-teal-700 hover:bg-teal-800 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {!service
                    ? 'Select a payment method above'
                    : `Pay FCFA ${(booking.totalAmount ?? 0).toLocaleString('fr-FR')} via ${chosenSvc?.name}`}
                </button>
              )}

              {/* Secure badge */}
              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Secured by MeSomb · Your PIN is never shared with MyBus
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
