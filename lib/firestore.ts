import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type Journey = {
  id?: string;
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string;
  estimatedArrivalTime: string;
  operatorName: string;
  busCode: string;
  busPlate?: string;
  driverName?: string;
  motorBoyName?: string;
  totalSeats: number;
  busType: string; // 70-seater, 50-seater, 30-seater
  journeyClass: string; // VIP or Classic
  pricePerSeat: number;
  amenities: string[];
  boardingStation: string;
  droppingStation: string;
  status: string;
};

export type SeatStatus = 'available' | 'held' | 'booked';

export type Seat = {
  status: SeatStatus;
  heldUntil?: Timestamp | null;
};

export type SeatMap = {
  seats: { [seatNumber: string]: Seat };
};

export type Booking = {
  id?: string;
  journeyId: string;
  passengerName: string;
  passengerSurname: string;
  passengerPhone: string;
  passengerEmail?: string;
  passengerGender?: string;
  idType?: string;
  idNumber?: string;
  seatNumber: string;
  luggageSize?: string;
  luggageTypes?: string[];
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  bookingReference: string;
  createdAt?: any;
  boardingPoint?: string;
  droppingPoint?: string;
};

export async function fetchJourneys(origin: string, destination: string, date: string) {
  const q = query(
    collection(db, 'journeys'),
    where('origin', '==', origin),
    where('destination', '==', destination),
    where('departureDate', '==', date),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  const items: Journey[] = [];
  snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Journey) }));
  return items;
}

export async function getJourneyById(journeyId: string) {
  const d = await getDoc(doc(db, 'journeys', journeyId));
  if (!d.exists()) return null;
  return { id: d.id, ...(d.data() as Journey) };
}

export async function fetchSeatMap(journeyId: string) {
  const d = await getDoc(doc(db, 'seats', journeyId));
  if (!d.exists()) return null;
  return d.data() as SeatMap;
}

export function listenSeatMap(journeyId: string, cb: (map: SeatMap | null) => void) {
  return onSnapshot(doc(db, 'seats', journeyId), (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data() as SeatMap);
  });
}

export async function holdSeatTransaction(journeyId: string, seatNumber: string, holdMinutes = 15) {
  const seatDoc = doc(db, 'seats', journeyId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(seatDoc);
    if (!snap.exists()) throw new Error('Seat map not found');
    const data = snap.data() as SeatMap;
    const seat = data.seats?.[seatNumber];
    const now = Timestamp.now();
    if (!seat || seat.status === 'booked') throw new Error('Seat not available');
    if (seat.status === 'held') {
      const heldUntil = seat.heldUntil as Timestamp | undefined;
      if (heldUntil && heldUntil.toMillis() > now.toMillis()) {
        throw new Error('Seat is currently held');
      }
    }
    const newSeat: Seat = {
      status: 'held',
      heldUntil: Timestamp.fromMillis(now.toMillis() + holdMinutes * 60 * 1000),
    };
    const newSeats = { ...(data.seats || {}), [seatNumber]: newSeat };
    tx.set(seatDoc, { seats: newSeats }, { merge: true });
  });
}

export async function releaseExpiredHolds(journeyId: string) {
  const seatDoc = doc(db, 'seats', journeyId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(seatDoc);
    if (!snap.exists()) return;
    const data = snap.data() as SeatMap;
    const now = Timestamp.now();
    const seats = { ...(data.seats || {}) };
    let changed = false;
    Object.keys(seats).forEach((k) => {
      const s = seats[k];
      if (s.status === 'held' && s.heldUntil && s.heldUntil.toMillis() <= now.toMillis()) {
        seats[k] = { status: 'available', heldUntil: null };
        changed = true;
      }
    });
    if (changed) tx.set(seatDoc, { seats }, { merge: true });
  });
}

export async function createBooking(b: Booking) {
  const ref = await addDoc(collection(db, 'bookings'), { ...b, createdAt: serverTimestamp() });
  return ref.id;
}

export function listenBooking(bookingId: string, cb: (data: any) => void) {
  return onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data());
  });
}

export async function getBookingById(bookingId: string) {
  const d = await getDoc(doc(db, 'bookings', bookingId));
  if (!d.exists()) return null;
  return { id: d.id, ...(d.data() as Booking) };
}
