import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Journey, Booking, SeatMap } from './firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmtFCFA(n: number): string {
  return 'FCFA ' + n.toLocaleString('fr-FR');
}

export function fmtDate(iso: string): string {
  // YYYY-MM-DD → DD-MM-YYYY
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

// ─── Journeys ─────────────────────────────────────────────────────────────────

export async function getAllJourneys(): Promise<Journey[]> {
  const snap = await getDocs(
    query(collection(db, 'journeys'), orderBy('departureDate', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Journey) }));
}

export async function createJourney(data: Omit<Journey, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'journeys'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  await initSeatMap(ref.id, data.totalSeats);
  return ref.id;
}

export async function updateJourney(id: string, data: Partial<Journey>): Promise<void> {
  await updateDoc(doc(db, 'journeys', id), data as Record<string, unknown>);
}

export async function cancelJourney(id: string): Promise<void> {
  await updateDoc(doc(db, 'journeys', id), { status: 'cancelled' });
}

// Initialise seatMap: seats numbered 2 → totalSeats+1 (seat 1 = driver)
export async function initSeatMap(journeyId: string, totalSeats: number): Promise<void> {
  const seats: Record<string, { status: string; heldUntil: null }> = {};
  for (let i = 2; i <= totalSeats + 1; i++) {
    seats[String(i)] = { status: 'available', heldUntil: null };
  }
  await setDoc(doc(db, 'seats', journeyId), { seats });
}

// Count booked / held / available for a journey from the seat map
export async function getSeatCounts(
  journeyId: string
): Promise<{ booked: number; held: number; available: number; total: number }> {
  const snap = await getDoc(doc(db, 'seats', journeyId));
  if (!snap.exists()) return { booked: 0, held: 0, available: 0, total: 0 };
  const seats = (snap.data() as SeatMap).seats ?? {};
  const values = Object.values(seats);
  return {
    total: values.length,
    booked: values.filter((s) => s.status === 'booked').length,
    held: values.filter((s) => s.status === 'held').length,
    available: values.filter((s) => s.status === 'available').length,
  };
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type BookingFilters = {
  paymentStatus?: string;
  route?: string;   // "Yaoundé→Douala"
  date?: string;    // YYYY-MM-DD
  journeyClass?: string;
};

export async function getAllBookings(): Promise<Booking[]> {
  const snap = await getDocs(
    query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Booking) }));
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    paymentStatus: 'confirmed',
    confirmedAt: serverTimestamp(),
  });
  // Mark seat as booked in seat map
  const snap = await getDoc(bookingRef);
  if (snap.exists()) {
    const b = snap.data() as Booking;
    const seatRef = doc(db, 'seats', b.journeyId);
    const seatSnap = await getDoc(seatRef);
    if (seatSnap.exists()) {
      const data = seatSnap.data() as SeatMap;
      await updateDoc(seatRef, {
        seats: {
          ...data.seats,
          [b.seatNumber]: { status: 'booked', heldUntil: null },
        },
      });
    }
  }
}

export async function cancelBookingAdmin(bookingId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) return;
  const b = snap.data() as Booking;

  // Release seat
  const seatRef = doc(db, 'seats', b.journeyId);
  const seatSnap = await getDoc(seatRef);
  if (seatSnap.exists()) {
    const data = seatSnap.data() as SeatMap;
    await updateDoc(seatRef, {
      seats: {
        ...data.seats,
        [b.seatNumber]: { status: 'available', heldUntil: null },
      },
    });
  }

  await updateDoc(bookingRef, { paymentStatus: 'cancelled' as Booking['paymentStatus'] });
}

export async function changeSeatAdmin(
  bookingId: string,
  journeyId: string,
  oldSeat: string,
  newSeat: string
): Promise<void> {
  const seatRef = doc(db, 'seats', journeyId);
  await runTransaction(db, async (tx) => {
    const seatSnap = await tx.get(seatRef);
    if (!seatSnap.exists()) throw new Error('Seat map not found');
    const data = seatSnap.data() as SeatMap;
    const target = data.seats?.[newSeat];
    if (!target || target.status !== 'available') throw new Error('Target seat is not available');
    tx.update(seatRef, {
      seats: {
        ...data.seats,
        [oldSeat]: { status: 'available', heldUntil: null },
        [newSeat]: { status: 'booked', heldUntil: null },
      },
    });
    tx.update(doc(db, 'bookings', bookingId), { seatNumber: newSeat });
  });
}

export async function releaseSeatAdmin(journeyId: string, seatNumber: string): Promise<void> {
  const seatRef = doc(db, 'seats', journeyId);
  const snap = await getDoc(seatRef);
  if (!snap.exists()) return;
  const data = snap.data() as SeatMap;
  await updateDoc(seatRef, {
    seats: { ...data.seats, [seatNumber]: { status: 'available', heldUntil: null } },
  });
}

// Returns all bookings for a journey, keyed by seatNumber
export async function getBookingsForJourney(
  journeyId: string
): Promise<Record<string, Booking>> {
  const q = query(collection(db, 'bookings'), where('journeyId', '==', journeyId));
  const snap = await getDocs(q);
  const map: Record<string, Booking> = {};
  snap.docs.forEach((d) => {
    const b = { id: d.id, ...(d.data() as Booking) };
    if (b.seatNumber) map[b.seatNumber] = b;
  });
  return map;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export type DashboardStats = {
  totalJourneysToday: number;
  totalBookingsToday: number;
  revenueToday: number;
  seatsSoldToday: number;
  totalSeatsToday: number;
  upcomingJourneys: Journey[];
  recentBookings: Booking[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10);

  const [journeySnap, recentSnap] = await Promise.all([
    getDocs(query(collection(db, 'journeys'), where('departureDate', '==', today))),
    getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(5))),
  ]);

  const todayJourneys: Journey[] = journeySnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Journey),
  }));
  const recentBookings: Booking[] = recentSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Booking),
  }));

  const journeyIds = todayJourneys.map((j) => j.id!).filter(Boolean);
  let totalBookingsToday = 0;
  let revenueToday = 0;
  let seatsSoldToday = 0;

  if (journeyIds.length > 0) {
    // batch in chunks of 10
    const chunks: string[][] = [];
    for (let i = 0; i < journeyIds.length; i += 10)
      chunks.push(journeyIds.slice(i, i + 10));

    await Promise.all(
      chunks.map(async (chunk) => {
        const bSnap = await getDocs(
          query(collection(db, 'bookings'), where('journeyId', 'in', chunk))
        );
        bSnap.docs.forEach((d) => {
          const b = d.data() as Booking;
          totalBookingsToday++;
          if (b.paymentStatus === 'confirmed') {
            revenueToday += b.totalAmount ?? 0;
            seatsSoldToday++;
          }
        });
      })
    );
  }

  const totalSeatsToday = todayJourneys.reduce((s, j) => s + (j.totalSeats ?? 0), 0);

  return {
    totalJourneysToday: todayJourneys.length,
    totalBookingsToday,
    revenueToday,
    seatsSoldToday,
    totalSeatsToday,
    upcomingJourneys: todayJourneys.slice(0, 10),
    recentBookings,
  };
}

// ─── Extended seat actions ────────────────────────────────────────────────────

/** Block an available seat with a reason */
export async function blockSeatAdmin(
  journeyId: string,
  seatNumber: string,
  reason: string,
  adminUid: string
): Promise<void> {
  const seatRef = doc(db, 'seats', journeyId);
  const snap = await getDoc(seatRef);
  if (!snap.exists()) throw new Error('Seat map not found');
  const data = snap.data() as SeatMap;
  await updateDoc(seatRef, {
    seats: {
      ...data.seats,
      [seatNumber]: {
        status: 'blocked',
        heldUntil: null,
        blockReason: reason,
        blockedBy: adminUid,
        blockedAt: Timestamp.now(),
      },
    },
  });
}

/** Release a blocked seat back to available */
export async function unblockSeatAdmin(journeyId: string, seatNumber: string): Promise<void> {
  const seatRef = doc(db, 'seats', journeyId);
  const snap = await getDoc(seatRef);
  if (!snap.exists()) throw new Error('Seat map not found');
  const data = snap.data() as SeatMap;
  await updateDoc(seatRef, {
    seats: { ...data.seats, [seatNumber]: { status: 'available', heldUntil: null } },
  });
}

/** Cancel a booking document and release its seat back to available */
export async function cancelBookingFromSeat(
  journeyId: string,
  bookingId: string,
  seatNumber: string
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const seatRef = doc(db, 'seats', journeyId);
  await runTransaction(db, async (tx) => {
    const seatSnap = await tx.get(seatRef);
    if (!seatSnap.exists()) throw new Error('Seat map not found');
    const data = seatSnap.data() as SeatMap;
    tx.update(bookingRef, { paymentStatus: 'cancelled' as Booking['paymentStatus'] });
    tx.set(
      seatRef,
      { seats: { ...data.seats, [seatNumber]: { status: 'available', heldUntil: null } } },
      { merge: true }
    );
  });
}

/** Force-confirm a pending booking and mark the seat as booked */
export async function forceConfirmBySeat(
  journeyId: string,
  bookingId: string,
  seatNumber: string
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const seatRef = doc(db, 'seats', journeyId);
  await runTransaction(db, async (tx) => {
    const seatSnap = await tx.get(seatRef);
    if (!seatSnap.exists()) throw new Error('Seat map not found');
    const data = seatSnap.data() as SeatMap;
    tx.update(bookingRef, { paymentStatus: 'confirmed' as Booking['paymentStatus'], confirmedAt: serverTimestamp() });
    tx.set(
      seatRef,
      { seats: { ...data.seats, [seatNumber]: { status: 'booked', heldUntil: null } } },
      { merge: true }
    );
  });
}

/** Release multiple held seats to available in one write */
export async function bulkReleaseHolds(journeyId: string, seatNumbers: string[]): Promise<void> {
  const seatRef = doc(db, 'seats', journeyId);
  const snap = await getDoc(seatRef);
  if (!snap.exists()) throw new Error('Seat map not found');
  const data = snap.data() as SeatMap;
  const updated = { ...data.seats };
  seatNumbers.forEach((n) => {
    updated[n] = { status: 'available', heldUntil: null };
  });
  await updateDoc(seatRef, { seats: updated });
}

/** Mark a journey as departed: set journey.status = 'departed' and lock all available/held seats */
export async function markJourneyDeparted(journeyId: string): Promise<void> {
  const journeyRef = doc(db, 'journeys', journeyId);
  const seatRef = doc(db, 'seats', journeyId);
  const seatSnap = await getDoc(seatRef);
  if (!seatSnap.exists()) throw new Error('Seat map not found');
  const data = seatSnap.data() as SeatMap;
  const updated = { ...data.seats };
  Object.keys(updated).forEach((n) => {
    if (updated[n].status === 'available' || updated[n].status === 'held') {
      updated[n] = { status: 'locked', heldUntil: null };
    }
  });
  const batch = writeBatch(db);
  batch.update(journeyRef, { status: 'departed' });
  batch.set(seatRef, { seats: updated }, { merge: true });
  await batch.commit();
}

export type SmsBroadcast = {
  journeyId: string;
  message: string;
  sentBy: string;
  recipientCount: number;
  recipients: string[];
};

/** Write an SMS broadcast document to Firestore (actual sending handled by Cloud Function) */
export async function createSmsBroadcast(data: SmsBroadcast): Promise<void> {
  await addDoc(collection(db, 'sms_broadcasts'), {
    ...data,
    sentAt: serverTimestamp(),
  });
}

// ─── All-time stats (Section 11) ─────────────────────────────────────────────

export type AllTimeStats = {
  totalBookings: number;
  totalConfirmedRevenue: number;
  totalJourneys: number;
  totalPassengersServed: number;
  totalRoutes: number;
};

export async function getAllTimeStats(): Promise<AllTimeStats> {
  const [bookingsSnap, journeysSnap] = await Promise.all([
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'journeys')),
  ]);

  const bookings = bookingsSnap.docs.map((d) => d.data() as Booking);
  const journeys = journeysSnap.docs.map((d) => d.data() as Journey);

  const totalBookings = bookings.length;
  const totalConfirmedRevenue = bookings
    .filter((b) => b.paymentStatus === 'confirmed')
    .reduce((s, b) => s + (b.totalAmount ?? 0), 0);
  const totalPassengersServed = bookings.filter((b) => b.paymentStatus === 'confirmed').length;
  const totalJourneys = journeys.length;

  const routeSet = new Set<string>();
  journeys.forEach((j) => {
    if (j.origin && j.destination) routeSet.add(`${j.origin}→${j.destination}`);
  });

  return {
    totalBookings,
    totalConfirmedRevenue,
    totalJourneys,
    totalPassengersServed,
    totalRoutes: routeSet.size,
  };
}

export type MonthlyRevenue = { label: string; revenue: number; month: string };

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  const snap = await getDocs(
    query(collection(db, 'bookings'), where('paymentStatus', '==', 'confirmed'))
  );

  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const b = d.data() as Booking;
    // createdAt may be Timestamp or null
    const ts = b.createdAt as Timestamp | null;
    if (!ts) return;
    const date = ts.toDate ? ts.toDate() : new Date(ts as any);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] ?? 0) + (b.totalAmount ?? 0);
  });

  const results: MonthlyRevenue[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    results.push({ label, revenue: map[key] ?? 0, month: key });
  }
  return results;
}

export type TopRoute = {
  route: string;
  totalBookings: number;
  totalRevenue: number;
  avgOccupancy: number;
};

export async function getTopRoutes(): Promise<TopRoute[]> {
  const [bookingsSnap, journeysSnap] = await Promise.all([
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'journeys')),
  ]);

  const bookings = bookingsSnap.docs.map((d) => d.data() as any);
  const journeys = journeysSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Journey) }));

  const routeMap: Record<string, { bookings: number; revenue: number; seats: number; totalSeats: number }> = {};

  bookings.forEach((b: any) => {
    if (!b.origin || !b.destination) return;
    const key = `${b.origin} → ${b.destination}`;
    if (!routeMap[key]) routeMap[key] = { bookings: 0, revenue: 0, seats: 0, totalSeats: 0 };
    routeMap[key].bookings++;
    if (b.paymentStatus === 'confirmed') routeMap[key].revenue += b.totalAmount ?? 0;
  });

  journeys.forEach((j) => {
    if (!j.origin || !j.destination) return;
    const key = `${j.origin} → ${j.destination}`;
    if (!routeMap[key]) routeMap[key] = { bookings: 0, revenue: 0, seats: 0, totalSeats: 0 };
    routeMap[key].totalSeats += j.totalSeats ?? 0;
  });

  return Object.entries(routeMap)
    .map(([route, v]) => ({
      route,
      totalBookings: v.bookings,
      totalRevenue: v.revenue,
      avgOccupancy: v.totalSeats > 0 ? Math.round((v.bookings / v.totalSeats) * 100) : 0,
    }))
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 5);
}

export type ActivityEvent = {
  type: 'booking' | 'confirmed' | 'cancelled' | 'departed' | 'hold_released';
  title: string;
  detail: string;
  timestamp: Timestamp | null;
  borderColor: string;
};

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const [bookingsSnap, journeysSnap] = await Promise.all([
    getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'journeys'), orderBy('createdAt', 'desc'), limit(5))),
  ]);

  const events: ActivityEvent[] = [];

  bookingsSnap.docs.forEach((d) => {
    const b = { id: d.id, ...(d.data() as any) };
    if (b.paymentStatus === 'confirmed') {
      events.push({
        type: 'confirmed',
        title: 'Payment confirmed',
        detail: `${b.bookingReference} · FCFA ${(b.totalAmount ?? 0).toLocaleString('fr-FR')}`,
        timestamp: b.createdAt ?? null,
        borderColor: 'border-l-emerald-500',
      });
    } else if (b.paymentStatus === 'cancelled' || b.paymentStatus === 'expired') {
      events.push({
        type: 'cancelled',
        title: 'Booking cancelled',
        detail: `${b.bookingReference} · ${b.origin} → ${b.destination}`,
        timestamp: b.createdAt ?? null,
        borderColor: 'border-l-red-500',
      });
    } else {
      events.push({
        type: 'booking',
        title: 'New booking',
        detail: `${b.passengerName ?? ''} ${b.passengerSurname ?? ''} · Seat ${b.seatNumber} · ${b.origin} → ${b.destination}`,
        timestamp: b.createdAt ?? null,
        borderColor: 'border-l-blue-500',
      });
    }
  });

  journeysSnap.docs.forEach((d) => {
    const j = { id: d.id, ...(d.data() as any) };
    if (j.status === 'departed') {
      events.push({
        type: 'departed',
        title: 'Journey departed',
        detail: `${j.origin} → ${j.destination} · ${j.departureTime}`,
        timestamp: j.createdAt ?? null,
        borderColor: 'border-l-slate-800',
      });
    }
  });

  events.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });

  return events.slice(0, 10);
}

export type JourneyWithStats = Journey & {
  bookedSeats: number;
  occupancyPct: number;
  confirmedRevenue: number;
};

export async function getAllJourneysWithStats(): Promise<JourneyWithStats[]> {
  const [journeysSnap, bookingsSnap] = await Promise.all([
    getDocs(query(collection(db, 'journeys'), orderBy('departureDate', 'desc'))),
    getDocs(collection(db, 'bookings')),
  ]);

  const journeys = journeysSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Journey) }));
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  return journeys.map((j) => {
    const jBookings = bookings.filter((b) => b.journeyId === j.id);
    const bookedSeats = jBookings.filter((b) => b.paymentStatus === 'confirmed').length;
    const confirmedRevenue = jBookings
      .filter((b) => b.paymentStatus === 'confirmed')
      .reduce((s, b) => s + (b.totalAmount ?? 0), 0);
    const occupancyPct = j.totalSeats > 0 ? Math.round((bookedSeats / j.totalSeats) * 100) : 0;
    return { ...j, bookedSeats, occupancyPct, confirmedRevenue };
  });
}
