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

/** Message as stored in the DB — includes mode for cross-mode history filtering. */
interface HistoryMessage extends Message {
  mode: string;
}

const MODE_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  coworker: "Co-worker",
  buddy: "Buddy",
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  recruiter: "Professional conversation about career, skills, and role fit",
  coworker: "Technical deep-dive — architecture, decisions, and engineering craft",
  buddy: "Casual and playful, with a healthy dose of friendly roasting",
};

/** Character count above which an assistant message is collapsed by default. */
const COLLAPSE_THRESHOLD = 600;

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [allHistory, setAllHistory] = useState<HistoryMessage[]>([]);
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
  // Tracks which long assistant messages have been manually expanded.
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Resolve recruiter token, mode config, and persisted history on mount.
  useEffect(() => {
    const stored = sessionStorage.getItem("recruiter_token");
    if (!stored) {
      router.replace("/invite-required");
      return;
    }
    const mode = sessionStorage.getItem("active_mode") ?? "";
    const modes = JSON.parse(sessionStorage.getItem("allowed_modes") ?? "[]");
    const canSwitch = sessionStorage.getItem("can_switch_modes") === "true";

    setToken(stored);
    setActiveMode(mode);
    const CANONICAL_MODE_ORDER = ["recruiter", "coworker", "buddy"];
    setAllowedModes(
      [...modes].sort(
        (a, b) =>
          CANONICAL_MODE_ORDER.indexOf(a) - CANONICAL_MODE_ORDER.indexOf(b),
      ),
    );
    setCanSwitchModes(canSwitch);

    // Fetch suggested prompts for all allowed modes.
    fetch("/api/chat/prompts", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prompts_by_mode) setPromptsByMode(data.prompts_by_mode);
      })
      .catch(() => {/* non-fatal */});

    // Fetch persisted history and pre-populate the message thread.
    setHistoryLoading(true);
    fetch("/api/chat/history", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`History fetch failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: { messages?: Array<{ role: string; content: string; provider?: string; model?: string; mode: string }> }) => {
        if (!data?.messages) return;
        const history: HistoryMessage[] = data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          provider: m.provider,
          model: m.model,
          mode: m.mode,
        }));
        setAllHistory(history);
        // Filter to the active mode — fall back to all history if mode is unknown.
        setMessages(mode ? history.filter((m) => m.mode === mode) : history);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setHistoryError(`Couldn't load conversation history: ${msg}`);
      })
      .finally(() => setHistoryLoading(false));
  }, [router]);

  // Scroll to bottom when new messages arrive or history loads.
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
    sessionStorage.setItem("active_mode", mode);
    // Restore persisted history for the new mode rather than clearing to empty.
    setMessages(allHistory.filter((m) => m.mode === mode));
    setError(null);
    setSwitchConfirm(null);
    inputRef.current?.focus();
  }

  function handleNewConversation() {
    // Clears the current view only — history is preserved in the DB and
    // will reappear on the next page load.
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  function handleLogout() {
    sessionStorage.clear();
    router.replace("/");
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || !token) return;

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
          active_mode: activeMode || undefined,
        }),
      });

      if (res.status === 401) {
        sessionStorage.clear();
        router.replace("/invite-required");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        provider: data.provider,
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Keep allHistory in sync so mode switches reflect new messages.
      setAllHistory((prev) => [
        ...prev,
        { ...userMessage, mode: activeMode },
        { ...assistantMessage, mode: activeMode },
      ]);
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
    <div className="flex flex-1 flex-col min-h-0 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">

        {/* Header row */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-white sm:text-lg">Chat</h1>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-400 sm:text-sm">
              Ask anything about Laud&apos;s background, projects, and experience.
            </p>
          </div>

          {/* Mode selector + actions */}
          <div className="flex flex-col gap-2 sm:items-end">
            {activeMode && (
              <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">I am a…</p>

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

            <div className="flex items-center gap-2 sm:self-end">
              {messages.length > 0 && (
                <button
                  onClick={handleNewConversation}
                  className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  + New Chat
                </button>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md border border-zinc-200 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
              >
                Exit
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

        {/* Message area — fills remaining space; dimmed when mode-switch dialog is open */}
        <div className={`messages-scroll mb-3 flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4 transition-opacity duration-200 dark:border-zinc-700/60 dark:bg-zinc-800/50 ${switchConfirm ? "pointer-events-none opacity-30" : ""}`}>

          {/* History loading indicator */}
          {historyLoading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="animate-pulse text-xs text-zinc-300 dark:text-zinc-600">Loading history…</p>
            </div>
          )}

          {/* History fetch error — non-fatal, dismissible */}
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

          {/* Empty state — only shown once history fetch is complete */}
          {!historyLoading && messages.length === 0 && !loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
              <div className="text-center animate-fade-in">
                <p className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {activeMode
                    ? `You're in ${MODE_LABELS[activeMode] ?? activeMode} mode`
                    : "Welcome"}
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

          {/* Messages */}
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
                    {/* Content — clipped with gradient fade when collapsed */}
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
                      {/* Gradient fade — only shown when clipped */}
                      {isLong && !isExpanded && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-zinc-800/90 dark:to-transparent" />
                      )}
                    </div>
                    {/* Read more / Show less toggle */}
                    {isLong && (
                      <button
                        onClick={() => toggleExpanded(i)}
                        className="mt-2 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                      >
                        {isExpanded ? "Show less ↑" : "Read more ↓"}
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

          {/* Typing indicator */}
          {loading && (
            <div className="animate-fade-in flex items-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-zinc-200/70 bg-white px-4 py-3 dark:border-zinc-700/40 dark:bg-zinc-800/80">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="animate-fade-in rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input row — always at bottom; dimmed when mode-switch dialog is open */}
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
  );
}
