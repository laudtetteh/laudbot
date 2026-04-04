import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-start px-6 py-24">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Private · Invite-only
      </p>
      <h1 className="mb-6 text-4xl font-semibold tracking-tight text-white">
        Ask me anything about Laud.
      </h1>
      <p className="mb-10 max-w-xl text-base leading-relaxed text-zinc-400">
        LaudBot is a professional agent that answers questions about Laud&apos;s
        background, projects, skills, and career direction — grounded in
        approved content, not guesswork.
      </p>
      <Link
        href="/chat"
        className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-80"
      >
        Start a conversation →
      </Link>
    </div>
  );
}
