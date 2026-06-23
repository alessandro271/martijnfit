"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Settings,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useChatContext } from "@/components/shell/dashboard-shell";
import { CoachSettingsPanel } from "./coach-settings-panel";
import {
  getCoachReply,
  getCoachIntro,
  SUGGESTION_CHIPS,
  type CoachAction,
} from "@/lib/mock/coach";
import { startOfWeek, addDays } from "@/lib/date";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  confirmation?: string;
  undo?: () => void;
}

let msgCounter = 0;
const nextId = () => `m${msgCounter++}`;

export function ChatPanel() {
  const store = useAppStore();
  const { chatOpen, setChatOpen } = useChatContext();
  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: "assistant", content: getCoachIntro() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const applyAction = (action: CoachAction): (() => void) | undefined => {
    if (action.kind === "addAdHoc") {
      const id = store.addAdHoc(action.item);
      return () => store.removeAdHoc(id);
    }
    store.movePlanItem(action.item, action.newDateISO);
    return undefined;
  };

  /** Scripted (demo-mode) coach — also the fallback when the live coach fails. */
  const scriptedReply = (trimmed: string) => {
    const weekStart = startOfWeek(store.today);
    const week = store.getWeekPlan(weekStart);
    const nextWeek = store.getWeekPlan(addDays(weekStart, 7));
    const ctx = {
      today: store.today,
      sessions: store.sessions,
      week,
      horizon: [...week, ...nextWeek],
    };
    const reply = getCoachReply(trimmed, ctx);
    let undo: (() => void) | undefined;
    if (reply.action) undo = applyAction(reply.action);
    setMessages((m) => [
      ...m,
      {
        id: nextId(),
        role: "assistant",
        content: reply.text,
        confirmation: reply.confirmation,
        undo,
      },
    ]);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: nextId(), role: "user", content: trimmed }]);
    setSending(true);

    // Live Claude coach when signed in against a real backend.
    if (isSupabaseConfigured && store.signedIn) {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      void (async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed, history }),
          });
          if (!res.ok) throw new Error(`chat ${res.status}`);
          const data = (await res.json()) as { text: string; changed: boolean };
          setMessages((m) => [
            ...m,
            { id: nextId(), role: "assistant", content: data.text },
          ]);
          if (data.changed) void store.reload();
        } catch {
          // Network/server error — fall back to the scripted coach.
          scriptedReply(trimmed);
        } finally {
          setSending(false);
        }
      })();
      return;
    }

    // Demo mode — scripted coach with a brief thinking delay.
    setTimeout(() => {
      scriptedReply(trimmed);
      setSending(false);
    }, 650);
  };

  const showChips = messages.length <= 1;

  return (
    <>
      {/* Floating button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 transition-all hover:scale-105 hover:brightness-110 active:scale-95 lg:bottom-6"
          aria-label="Open coach"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[var(--card-border)] bg-[var(--card)] transition-transform duration-300 sm:w-[420px]",
          chatOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/15">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-bold">Coach</p>
              <p className="text-[10px] text-[var(--muted)]">
                Plans around your week
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={cn(
                "rounded-lg p-2 transition-colors hover:bg-white/5",
                showSettings ? "text-[var(--accent)]" : "text-[var(--muted)]"
              )}
              aria-label="What the coach knows"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showSettings ? (
          <div className="flex-1 overflow-y-auto">
            <CoachSettingsPanel />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user"
                        ? "ml-auto bg-[var(--accent)] text-white"
                        : "bg-white/[0.04] text-[var(--foreground)]"
                    )}
                  >
                    {m.content}
                  </div>
                  {m.confirmation && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-3 py-2 text-xs">
                      <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span className="flex-1 font-medium">{m.confirmation}</span>
                      {m.undo && (
                        <button
                          onClick={() => {
                            m.undo?.();
                            setMessages((list) =>
                              list.map((x) =>
                                x.id === m.id
                                  ? { ...x, confirmation: undefined, undo: undefined }
                                  : x
                              )
                            );
                          }}
                          className="flex items-center gap-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Undo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="w-fit rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-[var(--muted)]">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                  </span>
                </div>
              )}

              {showChips && (
                <div className="space-y-2 pt-2">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => send(chip)}
                      className="block w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] px-3 py-2 text-left text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-[var(--card-border)] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your coach…"
                className="flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition-all hover:brightness-110 disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]"
      style={{ animationDelay: delay }}
    />
  );
}
