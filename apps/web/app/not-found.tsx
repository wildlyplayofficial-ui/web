import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-24 text-center">
      <h1 className="font-display text-5xl font-bold text-ink">404</h1>
      <p className="mt-4 text-muted">This play doesn&apos;t exist — but the board does.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-brand px-7 py-3 font-display font-semibold text-bg transition-transform hover:-translate-y-0.5"
      >
        Daily Board →
      </Link>
    </div>
  );
}
