"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-white">Chat</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Ask questions about Laud&apos;s background, projects, and experience.
      </p>

      {/* Message area */}
      <div className="mb-4 flex h-[28rem] flex-col gap-4 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-600">No messages yet.</p>
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
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
