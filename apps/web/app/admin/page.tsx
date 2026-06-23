import { getAdminStats } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/admin-auth";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getAdminStats();
  const { record } = stats;

  const recordStr = `${record.wins}W - ${record.losses}L - ${record.pushes}P`;
  const unitsPl = record.units_pl >= 0
    ? `+${record.units_pl.toFixed(2)}u`
    : `${record.units_pl.toFixed(2)}u`;

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Record"
          value={recordStr}
          sub={`${record.settled} settled`}
        />
        <StatCard
          label="Units P/L"
          value={unitsPl}
        />
        <StatCard
          label="Active Picks"
          value={stats.activePicks}
          sub={`${stats.totalPicks} total`}
        />
        <StatCard
          label="Active Watching"
          value={stats.activeWatching}
          sub={`${stats.totalWatching} total`}
        />
      </div>
    </div>
  );
}
