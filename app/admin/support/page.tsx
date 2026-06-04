"use client";
/**
 * /admin/support — Live chat support management page.
 * Left panel: session list (real-time). Right panel: active conversation.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, X, Send, CheckCircle2, MessageCircle } from 'lucide-react';
import { auth } from '../../../lib/firebase';
import {
  listenAllSessions, listenMessages, sendMessage, markGuestMessagesRead,
  setAgentTyping, closeChatSession,
  type SupportSessionListItem, type ChatMessage,
} from '../../../lib/chat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMsgTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
}

function fmtFull(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(date);
}

function sessionBadgeCls(s: SupportSessionListItem): string {
  if (s.status === 'closed') return 'bg-slate-100 text-slate-500 border-slate-200';
  const lastMsg = s.lastMessageAt?.toMillis?.() ?? 0;
  const recent = Date.now() - lastMsg < 10 * 60 * 1000;
  return recent
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

function sessionBadgeLabel(s: SupportSessionListItem): string {
  if (s.status === 'closed') return 'Closed';
  const lastMsg = s.lastMessageAt?.toMillis?.() ?? 0;
  return Date.now() - lastMsg < 10 * 60 * 1000 ? 'Active' : 'Waiting';
}

type FilterType = 'all' | 'open' | 'closed';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [sessions, setSessions] = useState<SupportSessionListItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [closingConfirm, setClosingConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  const sessionsUnsubRef = useRef<(() => void) | null>(null);
  const msgsUnsubRef = useRef<(() => void) | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Listen to all sessions ──────────────────────────────────────────────────
  useEffect(() => {
    sessionsUnsubRef.current = listenAllSessions((list) => setSessions(list));
    return () => { sessionsUnsubRef.current?.(); };
  }, []);

  // ── Listen to active conversation messages ──────────────────────────────────
  useEffect(() => {
    msgsUnsubRef.current?.();
    msgsUnsubRef.current = null;
    setMessages([]);

    if (!activeId) return;

    msgsUnsubRef.current = listenMessages(activeId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // Mark unread guest messages as read
    markGuestMessagesRead(activeId).catch(() => {});

    return () => { msgsUnsubRef.current?.(); };
  }, [activeId]);

  // ── Typing indicator (debounced) ────────────────────────────────────────────
  function handleInputChange(val: string) {
    setInput(val);
    if (!activeId) return;
    setAgentTyping(activeId, true).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (activeId) setAgentTyping(activeId, false).catch(() => {});
    }, 2000);
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    const adminEmail = auth.currentUser?.email ?? 'Admin';
    try {
      await sendMessage(activeId, 'agent', adminEmail, text);
      await setAgentTyping(activeId, false);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  // ── Close session ───────────────────────────────────────────────────────────
  async function handleClose() {
    if (!activeId) return;
    setClosing(true);
    try {
      await closeChatSession(activeId);
      setClosingConfirm(false);
    } catch { /* ignore */ } finally {
      setClosing(false);
    }
  }

  // ── Filtered sessions ───────────────────────────────────────────────────────
  const displayed = sessions.filter((s) => {
    if (filter === 'open' && s.status !== 'open') return false;
    if (filter === 'closed' && s.status !== 'closed') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.guestName?.toLowerCase().includes(q) ||
        s.guestPhone?.includes(q) ||
        (s.bookingReference ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-1px)] flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Live Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">{sessions.filter((s) => s.status === 'open').length} open sessions</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">

        {/* ── LEFT: Session list ── */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter + search */}
          <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['all', 'open', 'closed'] as FilterType[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    filter === f ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-teal-500">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, phone, booking ref…"
                className="flex-1 text-xs outline-none bg-transparent placeholder:text-slate-400"
              />
              {search && <button onClick={() => setSearch('')}><X className="h-3 w-3 text-slate-400" /></button>}
            </div>
          </div>

          {/* Session items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {displayed.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                <MessageCircle className="h-6 w-6 opacity-30" />
                <p className="text-xs">No sessions match</p>
              </div>
            )}
            {displayed.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveId(s.id); setClosingConfirm(false); }}
                className={`w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors ${
                  activeId === s.id ? 'bg-teal-50 border-l-2 border-teal-600' : ''
                } ${s.status === 'closed' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-900 truncate">{s.guestName}</p>
                      {s.unreadGuestMessages > 0 && (
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {s.unreadGuestMessages}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">{s.guestPhone}</p>
                    {s.bookingReference && (
                      <p className="text-[10px] text-teal-600 font-mono mt-0.5">#{s.bookingReference.slice(0, 12)}</p>
                    )}
                    {s.lastMessagePreview && (
                      <p className="text-[10px] text-slate-400 mt-1 truncate">{s.lastMessagePreview}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${sessionBadgeCls(s)}`}>
                      {sessionBadgeLabel(s)}
                    </span>
                    <span className="text-[9px] text-slate-400">{fmtMsgTime(s.lastMessageAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Conversation ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <MessageCircle className="h-10 w-10 opacity-20" />
              <p className="text-sm">Select a session to view the conversation</p>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{activeSession?.guestName}</p>
                  <p className="text-xs text-slate-500">{activeSession?.guestPhone}</p>
                  {activeSession?.bookingReference && (
                    <Link
                      href={`/admin/bookings?ref=${encodeURIComponent(activeSession.bookingReference)}`}
                      className="text-xs text-teal-600 font-mono hover:underline"
                    >
                      Booking: {activeSession.bookingReference}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeSession?.status !== 'closed' && (
                    !closingConfirm ? (
                      <button onClick={() => setClosingConfirm(true)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors">
                        Close Session
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">Confirm close?</span>
                        <button onClick={handleClose} disabled={closing}
                          className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                          {closing ? '…' : 'Yes'}
                        </button>
                        <button onClick={() => setClosingConfirm(false)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
                          No
                        </button>
                      </div>
                    )
                  )}
                  {activeSession?.status === 'closed' && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Closed</span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">No messages yet in this session.</p>
                )}
                {messages.map((msg) => {
                  const isAgent = msg.senderType === 'agent';
                  const isSystem = msg.senderType === 'system';
                  return (
                    <div key={msg.messageId} className={`flex flex-col ${isAgent ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
                      {!isSystem && (
                        <span className="text-[10px] text-slate-400 px-1 mb-0.5">{msg.senderName}</span>
                      )}
                      {isSystem ? (
                        <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1.5 rounded-full max-w-[80%] text-center">
                          {msg.content}
                        </div>
                      ) : (
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isAgent
                            ? 'bg-[#1e3a8a] text-white rounded-br-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 mt-0.5 px-1">{fmtFull(msg.sentAt)}</span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {activeSession?.status === 'closed' ? (
                <div className="p-3 bg-slate-100 text-xs text-slate-500 text-center border-t border-slate-200">
                  This session is closed. No further messages can be sent.
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white shrink-0">
                  <input
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Reply to passenger…"
                    disabled={sending}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 disabled:bg-slate-200 text-white transition-colors shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
