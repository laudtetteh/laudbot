import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-start justify-center overflow-hidden px-6 py-20 sm:py-28">
      {/* Radial glow — top-left accent */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
        }}
      />
      {/* Radial glow — bottom-right subtle warmth */}
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-[320px] w-[320px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-4xl">
        <p className="animate-fade-in mb-5 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Private · Invite-only
        </p>

        <h1
          className="animate-fade-in-up mb-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Ask me anything
          <br className="hidden sm:block" />
          {" "}about Laud.
        </h1>

        <p
          className="animate-fade-in-up mb-10 max-w-lg text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          LaudBot is a professional agent that answers questions about Laud&apos;s
          background, projects, skills, and career direction — grounded in
          approved content, not guesswork.
        </p>

        <div
          className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
          >
            Start a conversation →
          </Link>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            You&apos;ll need an invite link to access the chat.
          </p>
        </div>
      </div>
    </div>
  );
}
