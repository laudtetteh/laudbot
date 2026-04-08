"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
}

interface ConversationSummary {
  conversation_id: string;
  mode: string;
  started_at: string;
  message_count: number;
  preview: string;
}

const MODE_LABELS: Record<string, string> = {
  professional: "Professional",
  peer: "Peer",
  buddy: "Buddy",
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  professional: "Professional conversation about career, skills, and role fit",
  peer: "Technical deep-dive — architecture, decisions, and engineering craft",
  buddy: "Casual and playful, with a healthy dose of friendly roasting",
};

/** Tailwind classes for mode badges in the sidebar. */
const MODE_BADGE_STYLES: Record<string, string> = {
  professional: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  peer: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  buddy: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

/** Character count above which an assistant message is collapsed by default. */
const COLLAPSE_THRESHOLD = 600;

/** Format a UTC ISO string as a short relative label. */
function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string>("");
  const [allowedModes, setAllowedModes] = useState<string[]>([]);
  const [canSwitchModes, setCanSwitchModes] = useState(false);
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null);
  const [promptsByMode, setPromptsByMode] = useState<Record<string, string[]>>({});
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Load messages for a specific conversation and set it as active.
   *  Also switches the active mode to match the conversation's mode. */
  async function loadConversation(conversationId: string, storedToken: string, mode?: string) {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/chat/history?conversation_id=${conversationId}`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (!res.ok) throw new Error(`History fetch failed (${res.status})`);
      const data = await res.json();
      if (!data?.messages) return;
      setMessages(
        data.messages.map((m: { role: string; content: string; provider?: string; model?: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          provider: m.provider,
          model: m.model,
        }))
      );
      setActiveConversationId(conversationId);
      // Sync the mode pills to match this conversation.
      if (mode) {
        setActiveMode(mode);
        localStorage.setItem("active_mode", mode);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setHistoryError(`Couldn't load conversation: ${msg}`);
    } finally {
      setHistoryLoading(false);
    }
  }

  /** Refresh the sidebar conversation list. */
  async function refreshConversations(storedToken: string) {
    try {
      const res = await fetch("/api/chat/conversations", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.conversations) setConversations(data.conversations);
    } catch {
      /* non-fatal — sidebar just stays stale */
    }
  }

  // Initialise on mount.
  useEffect(() => {
    const stored = localStorage.getItem("visitor_token");
    if (!stored) {
      router.replace("/invite-required");
      return;
    }
    const mode = localStorage.getItem("active_mode") ?? "";
    const modes = JSON.parse(localStorage.getItem("allowed_modes") ?? "[]");
    const canSwitch = localStorage.getItem("can_switch_modes") === "true";

    setToken(stored);
    setActiveMode(mode);
    const CANONICAL_MODE_ORDER = ["professional", "peer", "buddy"];
    setAllowedModes(
      [...modes].sort(
        (a, b) => CANONICAL_MODE_ORDER.indexOf(a) - CANONICAL_MODE_ORDER.indexOf(b)
      )
    );
    setCanSwitchModes(canSwitch);

    // Fetch suggested prompts (non-fatal).
    fetch("/api/chat/prompts", { headers: { Authorization: `Bearer ${stored}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.prompts_by_mode) setPromptsByMode(data.prompts_by_mode); })
      .catch(() => {/* non-fatal */});

    // Load conversation list then restore most recent conversation.
    const init = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch("/api/chat/conversations", {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (!res.ok) throw new Error(`Conversations fetch failed (${res.status})`);
        const data = await res.json();
        const convos: ConversationSummary[] = data?.conversations ?? [];
        setConversations(convos);

        if (convos.length > 0) {
          // Filter to conversations matching the active mode, fall back to most recent overall.
          const modeMatch = convos.find((c) => c.mode === mode);
          const target = modeMatch ?? convos[0];
          await loadConversation(target.conversation_id, stored, target.mode);
        } else {
          // No history — generate a fresh conversation ID ready for first send.
          setActiveConversationId(crypto.randomUUID());
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setHistoryError(`Couldn't load conversation history: ${msg}`);
        setActiveConversationId(crypto.randomUUID());
      } finally {
        setHistoryLoading(false);
      }
    };
    init();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages.
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, loading]);

  function handleModeSwitch(mode: string) {
    if (mode === activeMode) return;
    if (messages.length > 0) {
      setSwitchConfirm(mode);
    } else {
      applyModeSwitch(mode);
    }
  }

  function applyModeSwitch(mode: string) {
    setActiveMode(mode);
    localStorage.setItem("active_mode", mode);
    // Mode switch starts a fresh conversation.
    setMessages([]);
    setActiveConversationId(crypto.randomUUID());
    setError(null);
    setSwitchConfirm(null);
    inputRef.current?.focus();
  }

  function handleNewConversation() {
    setMessages([]);
    setActiveConversationId(crypto.randomUUID());
    setError(null);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function handleLogout() {
    ["visitor_token", "visitor_id", "active_mode", "allowed_modes", "can_switch_modes"].forEach(
      (k) => localStorage.removeItem(k)
    );
    router.replace("/");
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || !token) return;

    // Ensure we always have a conversation ID before the first send.
    const convId = activeConversationId ?? crypto.randomUUID();
    if (!activeConversationId) setActiveConversationId(convId);

    const userMessage: Message = { role: "user", content };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
          conversation_id: convId,
          active_mode: activeMode || undefined,
        }),
      });

      if (res.status === 401) {
        ["visitor_token", "visitor_id", "active_mode", "allowed_modes", "can_switch_modes"].forEach(
          (k) => localStorage.removeItem(k)
        );
        router.replace("/invite-required");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, provider: data.provider, model: data.model },
      ]);

      // After the first exchange in a new conversation, refresh the sidebar list.
      if (nextMessages.length === 1 && token) {
        refreshConversations(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (token === null) return null;

  const suggestedPrompts = activeMode ? (promptsByMode[activeMode] ?? []) : [];

  return (
    <div className="flex flex-1 min-h-0">

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-zinc-200 bg-white
        dark:border-zinc-800 dark:bg-zinc-950
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        sm:static sm:translate-x-0 sm:flex
        mt-[57px] sm:mt-0
      `}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            History
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewConversation}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              + New
            </button>
            {/* Close button — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="sm:hidden rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="Close history"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2L12 12M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !historyLoading && (
            <p className="px-4 py-6 text-center text-xs text-zinc-300 dark:text-zinc-600">
              No past conversations
            </p>
          )}
          {conversations.map((conv) => {
            const isActive = conv.conversation_id === activeConversationId;
            const badgeStyle = MODE_BADGE_STYLES[conv.mode] ?? "bg-zinc-100 text-zinc-500";
            return (
              <button
                key={conv.conversation_id}
                onClick={() => {
                  if (token) loadConversation(conv.conversation_id, token, conv.mode);
                  setSidebarOpen(false);
                }}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                  isActive ? "bg-zinc-50 dark:bg-zinc-900" : ""
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeStyle}`}>
                    {MODE_LABELS[conv.mode] ?? conv.mode}
                  </span>
                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600">
                    {formatRelativeDate(conv.started_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {conv.preview}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/20 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main chat area ── */}
      <div className="flex flex-1 flex-col min-h-0 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">

          {/* Header row */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle — clock icon, distinct from the nav hamburger */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="sm:hidden rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                aria-label="Toggle history"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.25" />
                  <path d="M8 4.5V8L10.5 10" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-semibold text-zinc-900 dark:text-white sm:text-lg">Chat</h1>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-400 sm:text-sm">
                  Ask anything about Laud&apos;s background, projects, and experience.
                </p>
              </div>
            </div>

            {/* Mode selector + actions — single row on mobile, stacked on desktop */}
            <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
              {activeMode && (
                <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                  {/* "I am a…" label — hidden on mobile to save space */}
                  <p className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-500">I am a…</p>
                  {canSwitchModes && allowedModes.length > 1 ? (
                    <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                      {allowedModes.map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleModeSwitch(mode)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            mode === activeMode
                              ? "bg-zinc-900 text-white dark:bg-zinc-700 dark:text-white"
                              : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                          }`}
                        >
                          {MODE_LABELS[mode] ?? mode}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      {MODE_LABELS[activeMode] ?? activeMode}
                    </span>
                  )}
                </div>
              )}

              {/* Action buttons — icon-only on mobile, text on desktop */}
              <div className="flex items-center gap-1.5 sm:gap-2 sm:self-end">
                {messages.length > 0 && (
                  <button
                    onClick={handleNewConversation}
                    aria-label="New conversation"
                    className="flex items-center rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 sm:p-0 sm:hover:bg-transparent sm:dark:hover:bg-transparent"
                  >
                    {/* Pencil icon — mobile */}
                    <svg className="sm:hidden" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.5 1.5L13.5 4.5L5 13H2V10L10.5 1.5Z" />
                    </svg>
                    <span className="hidden sm:inline text-xs">+ New Chat</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  aria-label="Exit"
                  className="flex items-center rounded-md border border-zinc-200 p-1.5 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300 sm:px-3 sm:py-1"
                >
                  {/* Exit-door icon — mobile */}
                  <svg className="sm:hidden" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5.5 3H2.5V12H5.5" />
                    <path d="M9 10.5L12.5 7.5L9 4.5" />
                    <path d="M5.5 7.5H12.5" />
                  </svg>
                  <span className="hidden sm:inline text-xs">Exit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mode switch confirmation */}
          {switchConfirm && (
            <div className="animate-slide-down mb-3 flex-shrink-0 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-4 dark:border-zinc-700/60 dark:bg-zinc-800">
              <p className="mb-1 text-sm font-medium text-zinc-900 dark:text-white">
                Switch to {MODE_LABELS[switchConfirm] ?? switchConfirm} mode?
              </p>
              {MODE_DESCRIPTIONS[switchConfirm] && (
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-500">
                  {MODE_DESCRIPTIONS[switchConfirm]}
                </p>
              )}
              <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
                This will start a new conversation.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => applyModeSwitch(switchConfirm)}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  Yes, switch mode
                </button>
                <button
                  onClick={() => setSwitchConfirm(null)}
                  className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Message area */}
          <div className={`messages-scroll mb-3 flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4 transition-opacity duration-200 dark:border-zinc-700/60 dark:bg-zinc-800/50 ${switchConfirm ? "pointer-events-none opacity-30" : ""}`}>

            {historyLoading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="animate-pulse text-xs text-zinc-300 dark:text-zinc-600">Loading history…</p>
              </div>
            )}

            {historyError && !historyLoading && (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-500">
                <span>{historyError}</span>
                <button
                  onClick={() => setHistoryError(null)}
                  className="shrink-0 text-amber-700 hover:text-amber-400"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {!historyLoading && messages.length === 0 && !loading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
                <div className="text-center animate-fade-in">
                  <p className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {activeMode ? `You're in ${MODE_LABELS[activeMode] ?? activeMode} mode` : "Welcome"}
                  </p>
                  {activeMode && MODE_DESCRIPTIONS[activeMode] && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {MODE_DESCRIPTIONS[activeMode]}
                    </p>
                  )}
                </div>

                {suggestedPrompts.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 animate-fade-in-up">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        className="rounded-full border border-zinc-200/70 bg-zinc-100/60 px-4 py-2 text-xs text-zinc-500 transition-all hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {suggestedPrompts.length === 0 && (
                  <p className="animate-fade-in text-xs text-zinc-300 dark:text-zinc-600">Ask me anything.</p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`animate-fade-in-up flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900 sm:max-w-[78%]">
                    {msg.content}
                  </div>
                ) : (() => {
                  const isLong = msg.content.length > COLLAPSE_THRESHOLD;
                  const isExpanded = expandedMessages.has(i);
                  return (
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-zinc-200/70 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700/40 dark:bg-zinc-800/80 dark:text-zinc-100 sm:max-w-[85%]">
                      <div className={`relative ${isLong && !isExpanded ? "max-h-[180px] overflow-hidden" : ""}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            h1: ({ children }) => <h1 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">{children}</h3>,
                            a: ({ href, children }) => <a href={href} className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white" target="_blank" rel="noreferrer">{children}</a>,
                            code: ({ children }) => <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">{children}</code>,
                            hr: () => <hr className="my-2 border-zinc-200 dark:border-zinc-700" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {isLong && !isExpanded && (
                          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-zinc-800/90 dark:to-transparent" />
                        )}
                      </div>
                      {isLong && (
                        <button
                          onClick={() => toggleExpanded(i)}
                          className="mt-2 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                        >
                          {isExpanded ? "Show less ↑" : "TL;DR ↓"}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {msg.role === "assistant" && msg.provider && (
                  <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {msg.provider} · {msg.model}
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="animate-fade-in flex items-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-zinc-200/70 bg-white px-4 py-3 dark:border-zinc-700/40 dark:bg-zinc-800/80">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className={`flex gap-2 flex-shrink-0 sm:gap-3 transition-opacity duration-200 ${switchConfirm ? "pointer-events-none opacity-30" : ""}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something…"
              disabled={loading || !!switchConfirm}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-600 dark:focus:border-zinc-600 dark:disabled:text-zinc-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !!switchConfirm}
              className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 sm:px-5"
            >
              Send
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
