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
