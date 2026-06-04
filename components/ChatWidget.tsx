"use client";
/**
 * ChatWidget — floating live chat for passenger-facing pages.
 * Uses only Firestore + browser cookies + React. No external npm packages.
 * Sessions stored in Firestore: chat_sessions/{sessionId}/messages/{messageId}
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, ChevronLeft, ArrowLeft } from 'lucide-react';
import {
  getSessionCookie, setSessionCookie, createChatSession, getChatSession,
  listenMessages, listenSession, sendMessage, linkSessionToBooking,
  type ChatSession, type ChatMessage,
} from '../lib/chat';

interface Props {
  /** If provided, the chat session will be linked to this bookingId automatically */
  bookingId?: string;
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────

function fmtTime(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

// ─── Identification form ──────────────────────────────────────────────────────

function IdentForm({ onDone }: { onDone: (sessionId: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Please enter your name.'); return; }
    const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
    if (!/^6\d{8}$/.test(cleaned)) { setErr('Enter a valid CM number (6XXXXXXXX).'); return; }
    setLoading(true);
    try {
      const sessionId = await createChatSession(name.trim(), '+237' + cleaned);
      onDone(sessionId);
    } catch {
      setErr('Could not start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-4 space-y-4 flex-1 flex flex-col justify-center">
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">Start a support chat</p>
        <p className="text-xs text-slate-500">Please tell us your name and number so we can help you.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jean Claude" required
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number (CM)</label>
        <div className="flex">
          <span className="px-3 py-2 text-sm bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 shrink-0">🇨🇲 +237</span>
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="6 XX XX XX XX" required
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-r-lg outline-none focus:border-teal-500 bg-white"
          />
        </div>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        type="submit" disabled={loading}
        className="w-full bg-[#1e3a8a] hover:bg-blue-900 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {loading ? 'Starting chat…' : 'Start Chat'}
      </button>
    </form>
  );
}

// ─── Chat interface ───────────────────────────────────────────────────────────

function ChatInterface({
  sessionId,
  session,
  onClose,
}: {
  sessionId: string;
  session: ChatSession | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgUnsubRef = useRef<(() => void) | null>(null);
  // 3-minute auto-response timer
  const autoMsgSentRef = useRef(false);

  useEffect(() => {
    msgUnsubRef.current = listenMessages(sessionId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => { msgUnsubRef.current?.(); };
  }, [sessionId]);

  // Auto system message after 3 minutes if no agent reply
  useEffect(() => {
    if (autoMsgSentRef.current) return;
    const timer = setTimeout(async () => {
      const hasAgentReply = messages.some((m) => m.senderType === 'agent');
      if (!hasAgentReply && messages.some((m) => m.senderType === 'guest')) {
        autoMsgSentRef.current = true;
        await sendMessage(
          sessionId,
          'system',
          'MyBus Support',
          'Our team will respond shortly. You can also reach us by phone. Thank you for your patience.'
        );
      }
    }, 3 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [sessionId, messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      await sendMessage(sessionId, 'guest', session?.guestName ?? 'You', text);
    } catch {
      setInput(text); // restore on failure
    } finally {
      setSending(false);
    }
  }

  const isClosed = session?.status === 'closed';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {messages.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-8">
            Send a message to start the conversation. Our team typically responds within a few minutes.
          </p>
        )}
        {messages.map((msg) => {
          const isGuest = msg.senderType === 'guest';
          const isSystem = msg.senderType === 'system';
          return (
            <div key={msg.messageId} className={`flex flex-col ${isGuest ? 'items-end' : isSystem ? 'items-center' : 'items-start'}`}>
              {isSystem ? (
                <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1.5 rounded-full max-w-[90%] text-center">
                  {msg.content}
                </div>
              ) : (
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  isGuest
                    ? 'bg-[#1e3a8a] text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              )}
              <span className="text-[10px] text-slate-400 mt-0.5 px-1">{fmtTime(msg.sentAt)}</span>
            </div>
          );
        })}
        {session?.isAgentTyping && (
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-slate-500">Agent is typing</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="p-3 bg-slate-100 text-xs text-slate-500 text-center border-t border-slate-200">
          This support session has been closed. Start a new chat if you need further help.
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
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
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function ChatWidget({ bookingId }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [stage, setStage] = useState<'ident' | 'chat'>('ident');
  const [isMobile, setIsMobile] = useState(false);
  const sessionUnsubRef = useRef<(() => void) | null>(null);

  // Check viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mount: check cookie
  useEffect(() => {
    const sid = getSessionCookie();
    if (sid) {
      getChatSession(sid).then((s) => {
        if (s) {
          setSessionId(sid);
          setSession(s);
          setStage('chat');
        }
      });
    }
  }, []);

  // Listen to session doc for isAgentTyping / status changes
  useEffect(() => {
    if (!sessionId) return;
    sessionUnsubRef.current = listenSession(sessionId, (s) => {
      if (s) setSession(s);
    });
    return () => { sessionUnsubRef.current?.(); };
  }, [sessionId]);

  // Link to bookingId whenever it changes
  useEffect(() => {
    if (sessionId && bookingId) {
      linkSessionToBooking(sessionId, bookingId).catch(() => {});
    }
  }, [sessionId, bookingId]);

  function handleIdentDone(sid: string) {
    setSessionId(sid);
    setSessionCookie(sid);
    setStage('chat');
    getChatSession(sid).then((s) => { if (s) setSession(s); });
  }

  // Panel dimensions
  const panelCls = isMobile && open
    ? 'fixed inset-0 z-[9999] flex flex-col bg-white'
    : 'fixed bottom-20 right-4 z-[9999] w-[340px] h-[480px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden';

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className={panelCls}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1e3a8a] text-white shrink-0">
            {isMobile && (
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">MyBus Support Chat</p>
                <p className="text-[10px] text-blue-200 leading-none">We usually reply within minutes</p>
              </div>
            </div>
            {!isMobile && (
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {stage === 'ident' ? (
              <IdentForm onDone={handleIdentDone} />
            ) : (
              <ChatInterface sessionId={sessionId!} session={session} onClose={() => setOpen(false)} />
            )}
          </div>
        </div>
      )}

      {/* ── FAB button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open support chat"
        className="fixed bottom-4 right-4 z-[9999] w-14 h-14 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white shadow-xl flex items-center justify-center transition-all active:scale-95"
        style={{ zIndex: 9999 }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
