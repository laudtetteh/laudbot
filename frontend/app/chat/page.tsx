export default function ChatPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-white">Chat</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Ask questions about Laud&apos;s background, projects, and experience.
      </p>

      {/* Message area */}
      <div className="mb-4 flex h-96 flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-sm text-zinc-600">No messages yet.</p>
      </div>

      {/* Input row — non-functional in v1 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Ask something…"
          disabled
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 outline-none"
        />
        <button
          disabled
          className="rounded-md bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-500 cursor-not-allowed"
        >
          Send
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-600">
        Chat is not yet active — coming in a future release.
      </p>
    </div>
  );
}
