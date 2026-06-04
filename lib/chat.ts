/**
 * lib/chat.ts — Firestore helpers for the live chat support feature.
 * No external npm packages used. UUID via crypto.randomUUID().
 * All onSnapshot unsubscribe functions must be called on component unmount.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export interface ChatSession {
  sessionId: string;
  guestName: string;
  guestPhone: string;
  createdAt: Timestamp | null;
  status: 'open' | 'closed';
  bookingReference: string | null;
  isAgentTyping: boolean;
  lastMessageAt?: Timestamp | null;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  messageId: string;
  senderType: 'guest' | 'agent' | 'system';
  senderName: string;
  content: string;
  sentAt: Timestamp | null;
  read: boolean;
}

export interface SupportSessionListItem extends ChatSession {
  id: string;
  unreadGuestMessages: number;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME = 'mybus_chat_session';

export function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(COOKIE_NAME + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export function setSessionCookie(sessionId: string): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Create a new chat session and set the cookie. Returns the sessionId. */
export async function createChatSession(
  guestName: string,
  guestPhone: string
): Promise<string> {
  const sessionId = crypto.randomUUID();
  await setDoc(doc(db, 'chat_sessions', sessionId), {
    sessionId,
    guestName,
    guestPhone,
    createdAt: serverTimestamp(),
    status: 'open',
    bookingReference: null,
    isAgentTyping: false,
    lastMessageAt: null,
    lastMessagePreview: '',
  });
  setSessionCookie(sessionId);
  return sessionId;
}

/** Get a session by ID. Returns null if not found. */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const snap = await getDoc(doc(db, 'chat_sessions', sessionId));
  if (!snap.exists()) return null;
  return snap.data() as ChatSession;
}

/** Update the bookingReference on a session. */
export async function linkSessionToBooking(
  sessionId: string,
  bookingReference: string
): Promise<void> {
  await updateDoc(doc(db, 'chat_sessions', sessionId), { bookingReference });
}

/** Close a session. */
export async function closeChatSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'chat_sessions', sessionId), { status: 'closed' });
}

/** Listen to a single session document in real time. */
export function listenSession(
  sessionId: string,
  cb: (session: ChatSession | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'chat_sessions', sessionId), (snap) => {
    cb(snap.exists() ? (snap.data() as ChatSession) : null);
  });
}

// ─── Message helpers ──────────────────────────────────────────────────────────

/** Send a message to a session. Updates lastMessageAt on the session document. */
export async function sendMessage(
  sessionId: string,
  senderType: 'guest' | 'agent' | 'system',
  senderName: string,
  content: string
): Promise<void> {
  const messageId = crypto.randomUUID();
  const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
  const sessionRef = doc(db, 'chat_sessions', sessionId);

  const batch = writeBatch(db);
  batch.set(doc(messagesRef, messageId), {
    messageId,
    senderType,
    senderName,
    content,
    sentAt: serverTimestamp(),
    read: senderType !== 'guest', // guest messages start as unread
  });
  batch.update(sessionRef, {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: content.slice(0, 60),
  });
  await batch.commit();
}

/** Listen to messages in a session, ordered by time. */
export function listenMessages(
  sessionId: string,
  cb: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chat_sessions', sessionId, 'messages'),
    orderBy('sentAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as ChatMessage));
  });
}

/** Mark all unread guest messages in a session as read. */
export async function markGuestMessagesRead(sessionId: string): Promise<void> {
  const q = query(
    collection(db, 'chat_sessions', sessionId, 'messages'),
    where('senderType', '==', 'guest'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/** Count unread guest messages in a session. */
export async function countUnreadGuestMessages(sessionId: string): Promise<number> {
  const q = query(
    collection(db, 'chat_sessions', sessionId, 'messages'),
    where('senderType', '==', 'guest'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  return snap.size;
}

// ─── Admin: session list ──────────────────────────────────────────────────────

/** Listen to all sessions ordered by last message time (real-time). */
export function listenAllSessions(
  cb: (sessions: SupportSessionListItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chat_sessions'),
    orderBy('lastMessageAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, async (snap) => {
    const sessions: SupportSessionListItem[] = await Promise.all(
      snap.docs.map(async (d) => {
        const session = d.data() as ChatSession;
        const unread = await countUnreadGuestMessages(d.id);
        return { ...session, id: d.id, unreadGuestMessages: unread };
      })
    );
    cb(sessions);
  });
}

// ─── Agent typing indicator ───────────────────────────────────────────────────

/** Set agent typing status on a session. */
export async function setAgentTyping(
  sessionId: string,
  isTyping: boolean
): Promise<void> {
  await updateDoc(doc(db, 'chat_sessions', sessionId), { isAgentTyping: isTyping });
}
