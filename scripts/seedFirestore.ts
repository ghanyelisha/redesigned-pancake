/**
 * Seed Firestore with sample journeys and seat maps.
 * Usage: node ./scripts/seedFirestore.js after building/transpiling, or run with ts-node.
 * Requires a Firebase service account JSON pointed by GOOGLE_APPLICATION_CREDENTIALS.
 */

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function seed() {
  const journeys = [
    {
      origin: 'Yaoundé',
      destination: 'Douala',
      departureDate: new Date().toISOString().slice(0,10),
      departureTime: '08:05 AM',
      estimatedArrivalTime: '01:00 PM',
      operatorName: 'Musango Bus Service Co. Ltd.',
      busCode: 'YDE-BUA D 001',
      totalSeats: 70,
      busType: '70-seater',
      journeyClass: 'Classic',
      pricePerSeat: 4000,
      amenities: ['WiFi','Water'],
      boardingStation: 'CARREFOUR MVAN',
      droppingStation: 'NDOBBO BONABERI',
      status: 'active'
    },
    {
      origin: 'Douala',
      destination: 'Buea',
      departureDate: new Date().toISOString().slice(0,10),
      departureTime: '09:00 AM',
      estimatedArrivalTime: '12:00 PM',
      operatorName: 'Buea Express',
      busCode: 'DLA-BUA D 002',
      totalSeats: 50,
      busType: '50-seater',
      journeyClass: 'VIP',
      pricePerSeat: 5000,
      amenities: ['WiFi'],
      boardingStation: 'MAIN STATION',
      droppingStation: 'CENTRAL PARK',
      status: 'active'
    },
    {
      origin: 'Yaoundé',
      destination: 'Kumba',
      departureDate: new Date().toISOString().slice(0,10),
      departureTime: '07:00 AM',
      estimatedArrivalTime: '11:30 AM',
      operatorName: 'Swift Transit',
      busCode: 'YDE-KMB 003',
      totalSeats: 30,
      busType: '30-seater',
      journeyClass: 'Classic',
      pricePerSeat: 3500,
      amenities: ['Water'],
      boardingStation: 'CENTRAL YDE',
      droppingStation: 'KUMBA STATION',
      status: 'active'
    }
  ];

  for (const j of journeys) {
    const ref = await db.collection('journeys').add(j as any);
    const seats: any = {};
    const total = j.totalSeats as number;
    for (let i=2;i<=total;i++){
      seats[String(i)] = { status: 'available', heldUntil: null };
    }
    await db.collection('seats').doc(ref.id).set({ seats });
    console.log('Seeded journey', ref.id);
  }
  console.log('Done seeding');
}

seed().catch(err=>{ console.error(err); process.exit(1); });
