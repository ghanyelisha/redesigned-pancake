"use client";
/**
 * ChatWidget — floating live chat for passenger-facing pages.
 * No external npm packages. Firestore + browser cookies + React only.
 *
 * Session lifecycle handled here:
 *  • New visitor → ident form → create session → chat
 *  • Returning visitor with OPEN session → straight to chat
 *  • Returning visitor with CLOSED session → chat history (read-only) +
 *    "Start New Chat" button that creates a fresh session
 */
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, PlusCircle } from 'lucide-react';
import {
  getSessionCookie,
  setSessionCookie,
  createChatSession,
  getChatSession,
  listenMessages,
  listenSession,
  sendMessage,
  linkSessionToBooking,
  type ChatSession,
  type ChatMessage,
} from '../lib/chat';

interface Props {
  /** When on the payment/confirmation page this links the session to the booking */
  bookingId?: string;
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────

function fmtTime(ts: any): string {
  if (!ts) return '';
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

// ─── Identification form ──────────────────────────────────────────────────────

function IdentForm({
  onDone,
  showNewChatPrompt = false,
}: {
  onDone: (sessionId: string) => void;
  /** When true the form is shown after a closed session → different heading */
  showNewChatPrompt?: boolean;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Please enter your name.');
      return;
    }
    const cleaned = phone.replace(/[\s\-()]/g, '').replace(/^(\+237|237)/, '');
    if (!/^6\d{8}$/.test(cleaned)) {
      setErr('Enter a valid CM number (6XXXXXXXX).');
      return;
    }
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
    <form
      onSubmit={submit}
      className="p-5 space-y-4 flex-1 flex flex-col justify-center"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">
          {showNewChatPrompt ? 'Start a new conversation' : 'Start a support chat'}
        </p>
        <p className="text-xs text-slate-500">
          {showNewChatPrompt
            ? 'Your previous session was closed. Fill in your details to open a new one.'
            : 'Please tell us your name and number so we can assist you.'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Your Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jean Claude"
          required
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 bg-white transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Phone Number (CM)
        </label>
        <div className="flex">
          <span className="px-3 py-2 text-sm bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 shrink-0">
            🇨🇲 +237
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="6 XX XX XX XX"
            required
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-r-lg outline-none focus:border-teal-500 bg-white transition-colors"
          />
        </div>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1e3a8a] hover:bg-blue-900 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Starting…
          </span>
        ) : (
          'Start Chat'
        )}
      </button>
    </form>
  );
}

// ─── Chat interface ───────────────────────────────────────────────────────────

function ChatInterface({
  sessionId,
  session,
  onNewChat,
}: {
  sessionId: string;
  session: ChatSession | null;
  onNewChat: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const autoMsgSentRef = useRef(false);

  // Subscribe to messages
  useEffect(() => {
    unsubRef.current = listenMessages(sessionId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    return () => {
      unsubRef.current?.();
    };
  }, [sessionId]);

  // Auto system message after 3 min with no agent reply
  useEffect(() => {
    if (autoMsgSentRef.current) return;
    const t = setTimeout(async () => {
      const hasAgent = messages.some((m) => m.senderType === 'agent');
      const hasGuest = messages.some((m) => m.senderType === 'guest');
      if (!hasAgent && hasGuest) {
        autoMsgSentRef.current = true;
        await sendMessage(
          sessionId,
          'system',
          'MyBus Support',
          'Our team will respond shortly. You can also reach us by phone. Thank you for your patience.'
        );
      }
    }, 3 * 60 * 1000);
    return () => clearTimeout(t);
  }, [sessionId, messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(sessionId, 'guest', session?.guestName ?? 'You', text);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  const isClosed = session?.status === 'closed';

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {messages.length === 0 && !isClosed && (
          <p className="text-center text-xs text-slate-400 py-8">
            Send a message to start the conversation.
            <br />
            Our team typically responds within minutes.
          </p>
        )}

        {messages.map((msg) => {
          const isGuest = msg.senderType === 'guest';
          const isSystem = msg.senderType === 'system';
          return (
            <div
              key={msg.messageId}
              className={`flex flex-col ${
                isGuest ? 'items-end' : isSystem ? 'items-center' : 'items-start'
              }`}
            >
              {isSystem ? (
                <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1.5 rounded-full max-w-[90%] text-center leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isGuest
                      ? 'bg-[#1e3a8a] text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              )}
              <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                {fmtTime(msg.sentAt)}
              </span>
            </div>
          );
        })}

        {/* Agent typing indicator */}
        {session?.isAgentTyping && (
          <div className="flex items-center gap-1.5 px-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500">Agent is typing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Closed session banner + New Chat button */}
      {isClosed ? (
        <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-col items-center gap-3">
          <p className="text-xs text-slate-500 text-center">
            This support session has been closed.
          </p>
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white text-sm font-semibold transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Start New Chat
          </button>
        </div>
      ) : (
        /* Message input */
        <form
          onSubmit={handleSend}
          className="shrink-0 flex items-center gap-2 p-3 border-t border-slate-200 bg-white"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-white placeholder:text-slate-400 transition-colors"
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

type Stage = 'ident' | 'chat' | 'new-chat-after-closed';

export default function ChatWidget({ bookingId }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [stage, setStage] = useState<Stage>('ident');
  const [isMobile, setIsMobile] = useState(false);
  const sessionUnsubRef = useRef<(() => void) | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mount: check existing cookie
  useEffect(() => {
    const sid = getSessionCookie();
    if (!sid) return;
    getChatSession(sid).then((s) => {
      if (!s) return; // stale cookie — leave on ident
      setSessionId(sid);
      setSession(s);
      // Returning user with a CLOSED session → go to chat view (read-only) so
      // they can read history; the "Start New Chat" button is shown in the interface.
      setStage('chat');
    });
  }, []);

  // Live-listen to session doc (typing indicator, status changes)
  useEffect(() => {
    sessionUnsubRef.current?.();
    sessionUnsubRef.current = null;
    if (!sessionId) return;
    sessionUnsubRef.current = listenSession(sessionId, (s) => {
      if (s) setSession(s);
    });
    return () => {
      sessionUnsubRef.current?.();
    };
  }, [sessionId]);

  // Auto-link to current booking page
  useEffect(() => {
    if (sessionId && bookingId) {
      linkSessionToBooking(sessionId, bookingId).catch(() => {});
    }
  }, [sessionId, bookingId]);

  /** Called after ident form creates a brand-new session */
  function handleIdentDone(sid: string) {
    setSessionCookie(sid);
    setSessionId(sid);
    setStage('chat');
    getChatSession(sid).then((s) => {
      if (s) setSession(s);
    });
  }

  /**
   * Called when the user clicks "Start New Chat" from a closed session.
   * Clears the old session reference and shows the ident form again.
   */
  function handleNewChat() {
    // Clear cookie so a fresh session will be created
    document.cookie =
      'mybus_chat_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    setSessionId(null);
    setSession(null);
    setStage('ident');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const panelCls =
    isMobile && open
      ? 'fixed inset-0 z-[9999] flex flex-col bg-white'
      : 'fixed bottom-20 right-4 z-[9999] w-[340px] h-[480px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden';

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div className={panelCls}>
          {/* Header bar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#1e3a8a] text-white">
            {isMobile && (
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  MyBus Support Chat
                </p>
                <p className="text-[10px] text-blue-200 leading-none">
                  We usually reply within minutes
                </p>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {stage === 'ident' ? (
              <IdentForm onDone={handleIdentDone} showNewChatPrompt={false} />
            ) : stage === 'new-chat-after-closed' ? (
              <IdentForm onDone={handleIdentDone} showNewChatPrompt={true} />
            ) : (
              <ChatInterface
                sessionId={sessionId!}
                session={session}
                onNewChat={handleNewChat}
              />
            )}
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      {(() => {
        const hasOpenSession = !open && stage === 'chat' && session?.status !== 'closed';
        return (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close support chat' : hasOpenSession ? 'Resume chat' : 'Open support chat'}
            className={`fixed bottom-4 right-4 z-[9999] h-14 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white shadow-xl flex items-center justify-center transition-all active:scale-95 ${hasOpenSession ? 'px-5 gap-2' : 'w-14'}`}
          >
            {open ? (
              <X className="h-6 w-6" />
            ) : hasOpenSession ? (
              <>
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-semibold whitespace-nowrap">Resume Chat</span>
              </>
            ) : (
              <MessageCircle className="h-6 w-6" />
            )}
          </button>
        );
      })()}
    </>
  );
}
