export default function InviteRequiredPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-3 text-lg font-semibold text-white">Invite required</h1>
      <p className="mb-6 text-sm text-zinc-400">
        LaudBot is invite-only. You&apos;ll need a link from Laud to start a
        conversation.
      </p>
      <p className="text-xs text-zinc-600">
        Already have a link? Open it in the same browser tab.
      </p>
    </div>
  );
}
