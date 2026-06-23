/** Spinning football loader — used across all loading states. Pure CSS + inline SVG, no assets. */
export function BallLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg
        className="animate-spin"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        style={{ animationDuration: "0.9s" }}
      >
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" className="text-line" />
        <path
          d="M20 2a18 18 0 0 1 18 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-brand"
        />
        {/* Football pentagon pattern */}
        <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted opacity-40" />
        <circle cx="20" cy="20" r="2.5" fill="currentColor" className="text-muted opacity-30" />
      </svg>
    </div>
  );
}
