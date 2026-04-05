export default function InviteRequiredPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm animate-fade-in-up text-center">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-8 py-10">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 text-base">
            ⛔
          </div>
          <h1 className="mb-2 text-base font-semibold text-white">
            Invite required
          </h1>
          <p className="mb-4 text-sm text-zinc-400">
            LaudBot is invite-only. You&apos;ll need a link from Laud to start a
            conversation.
          </p>
          <p className="text-xs text-zinc-600">
            Already have a link? Open it in the same browser tab.
          </p>
        </div>
      </div>
    </div>
  );
}
