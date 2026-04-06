export default function InviteRequiredPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm animate-fade-in-up text-center">
        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-8 py-10 dark:border-zinc-800/70 dark:bg-zinc-900/60">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-base text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            ⛔
          </div>
          <h1 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">
            Invite required
          </h1>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            LaudBot is invite-only. You&apos;ll need a link from Laud to start a
            conversation.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Already have a link? Open it in the same browser tab.
          </p>
        </div>
      </div>
    </div>
  );
}
