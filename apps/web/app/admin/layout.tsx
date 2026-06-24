import Link from "next/link";
import { getAdminSession, logoutAction } from "@/lib/admin-auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/picks", label: "Picks" },
  { href: "/admin/watching", label: "Watching" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/channels", label: "Channels" },
  { href: "/admin/booth", label: "The Booth" },
  { href: "/admin/goalline", label: "Daily Line" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminSession();

  // Not logged in — render children only (login page)
  if (!user) {
    return <div className="h-full bg-bg text-ink">{children}</div>;
  }

  return (
    <div className="flex h-full bg-bg text-ink">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-card">
        <div className="border-b border-line px-4 py-4">
          <Link href="/admin" className="font-display text-lg font-bold text-brand">
            WP Admin
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-card-hover hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 truncate text-xs text-muted">{user.email}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-loss hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
