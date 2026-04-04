import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-white"
        >
          LaudBot
        </Link>
        <ul className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
