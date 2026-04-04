const plannedFeatures = [
  {
    title: "Source management",
    description: "Approve, revoke, and review the content LaudBot is allowed to use.",
  },
  {
    title: "Privacy controls",
    description: "Define what the bot can and cannot disclose.",
  },
  {
    title: "Response review",
    description: "Audit past responses and flag anything that needs correction.",
  },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-white">Admin</h1>
      <p className="mb-10 text-sm text-zinc-500">
        Owner-only controls for managing LaudBot&apos;s knowledge and behaviour.
        Not yet implemented.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {plannedFeatures.map(({ title, description }) => (
          <div
            key={title}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
          >
            <h2 className="mb-2 text-sm font-medium text-zinc-300">{title}</h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
