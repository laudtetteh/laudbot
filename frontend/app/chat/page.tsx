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

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string>("");
  const [allowedModes, setAllowedModes] = useState<string[]>([]);
  const [canSwitchModes, setCanSwitchModes] = useState(false);
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null);
  const [promptsByMode, setPromptsByMode] = useState<Record<string, string[]>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Resolve recruiter token and mode config on mount.
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
    setAllowedModes(modes);
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
  }, [router]);

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
    setMessages([]);
    setError(null);
    setSwitchConfirm(null);
  }

  function handleNewConversation() {
    setMessages([]);
    setError(null);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          provider: data.provider,
          model: data.model,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
    <div className="mx-auto flex max-w-4xl flex-col px-6 py-10">
      {/* Header row */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-white">Chat</h1>
          <p className="text-sm text-zinc-500">
            Ask anything about Laud&apos;s background, projects, and experience.
          </p>
        </div>

        {/* Right side: mode selector + actions */}
        <div className="flex flex-col items-end gap-2">
          {activeMode && (
            <div className="flex flex-col items-end gap-1.5">
              {/* "I am a…" label */}
              <p className="text-xs text-zinc-600">I am a…</p>

              {canSwitchModes && allowedModes.length > 1 ? (
                <div className="flex gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                  {allowedModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleModeSwitch(mode)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        mode === activeMode
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {MODE_LABELS[mode] ?? mode}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
                  {MODE_LABELS[activeMode] ?? activeMode}
                </span>
              )}
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewConversation}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                New conversation
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md border border-zinc-800 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Mode switch confirmation dialog */}
      {switchConfirm && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-4">
          <p className="mb-1 text-sm font-medium text-white">
            Switch to {MODE_LABELS[switchConfirm] ?? switchConfirm} mode?
          </p>
          {MODE_DESCRIPTIONS[switchConfirm] && (
            <p className="mb-3 text-xs text-zinc-500">
              {MODE_DESCRIPTIONS[switchConfirm]}
            </p>
          )}
          <p className="mb-3 text-xs text-zinc-600">
            This will start a new conversation.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => applyModeSwitch(switchConfirm)}
              className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600"
            >
              Yes, switch mode
            </button>
            <button
              onClick={() => setSwitchConfirm(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message area */}
      <div className="mb-4 flex h-[28rem] flex-col gap-4 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            {/* Mode-aware welcome */}
            <div className="text-center">
              <p className="mb-1 text-sm font-medium text-zinc-400">
                {activeMode
                  ? `You're in ${MODE_LABELS[activeMode] ?? activeMode} mode`
                  : "Welcome"}
              </p>
              {activeMode && MODE_DESCRIPTIONS[activeMode] && (
                <p className="text-xs text-zinc-600">
                  {MODE_DESCRIPTIONS[activeMode]}
                </p>
              )}
            </div>

            {/* Suggested prompt chips */}
            {suggestedPrompts.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {suggestedPrompts.length === 0 && (
              <p className="text-xs text-zinc-700">Ask me anything.</p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    h1: ({ children }) => <h1 className="mb-2 text-base font-semibold text-white">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-1.5 text-sm font-semibold text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-1 text-sm font-medium text-zinc-300">{children}</h3>,
                    a: ({ href, children }) => <a href={href} className="text-zinc-300 underline hover:text-white" target="_blank" rel="noreferrer">{children}</a>,
                    code: ({ children }) => <code className="rounded bg-zinc-700 px-1 py-0.5 font-mono text-xs text-zinc-200">{children}</code>,
                    hr: () => <hr className="my-2 border-zinc-700" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            {msg.role === "assistant" && msg.provider && (
              <span className="text-xs text-zinc-600">
                {msg.provider} · {msg.model}
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something…"
          disabled={loading}
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 disabled:text-zinc-500"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
