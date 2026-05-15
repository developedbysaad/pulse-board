import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { electionsApi } from "../../api/elections";
import { useElectionSocket } from "../../hooks/useElectionSocket";
import { Header } from "../../components/Header";
import { ShareLink } from "../../components/ShareLink";
import { Card, Banner, Stat, Tag } from "../../components/ui";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_COLORS = {
  ink: "rgba(34, 32, 29, 1)",
  inkMuted: "rgba(34, 32, 29, 0.45)",
  grid: "rgba(34, 32, 29, 0.08)",
  bar: "rgba(224, 74, 43, 0.85)",
  barBorder: "rgba(180, 50, 25, 1)",
};

const CHART_OPTIONS = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: CHART_COLORS.ink,
      titleFont: { family: "Inter", size: 12, weight: "600" },
      bodyFont: { family: "JetBrains Mono", size: 11 },
      padding: 10,
      cornerRadius: 0,
      displayColors: false,
    },
  },
  scales: {
    y: {
      ticks: {
        precision: 0,
        color: CHART_COLORS.inkMuted,
        font: { family: "JetBrains Mono", size: 10 },
      },
      grid: { color: CHART_COLORS.grid, drawBorder: false },
    },
    x: {
      ticks: {
        color: CHART_COLORS.inkMuted,
        font: { family: "Inter", size: 11 },
      },
      grid: { display: false },
    },
  },
};

export default function AnalyticsPage() {
  const { id } = useParams();
  const electionId = Number(id);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", electionId],
    queryFn: () => electionsApi.analytics(electionId),
  });

  const { latest, status } = useElectionSocket({ electionId });

  useEffect(() => {
    if (latest) qc.invalidateQueries({ queryKey: ["analytics", electionId] });
  }, [latest, electionId, qc]);

  useEffect(() => {
    if (status) qc.invalidateQueries({ queryKey: ["analytics", electionId] });
  }, [status, electionId, qc]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
            Loading…
          </p>
        </main>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Banner kind="error">
            {error.response?.data?.error || error.message}
          </Banner>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to={`/elections/${electionId}`}
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to editor
        </Link>

        <header className="mt-4 grid gap-8 border-b border-ink/15 pb-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Tag tone="live">Live</Tag>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Updates the moment a vote arrives
              </span>
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl">
              The room is{" "}
              <em className="italic text-brand-600">responding</em>.
            </h1>
            {data.election?.customUrl && (
              <div className="mt-5 max-w-md">
                <ShareLink
                  path={`/e/${data.election.customUrl}`}
                  title={`Vote: ${data.election.name}`}
                  size="compact"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Stat label="Responses" value={data.totalResponses} />
            {data.participation ? (
              <Stat
                label="Participation"
                value={`${data.participation.percent}%`}
                sub={`${data.participation.responses} of ${data.participation.eligible} voters`}
              />
            ) : (
              <Stat label="Mode" value="Open" sub="Anonymous link" />
            )}
          </div>
        </header>

        {data.perQuestion.length === 0 && (
          <Card className="mt-8 py-12 text-center">
            <p className="font-display text-3xl italic text-ink-soft">
              No questions yet.
            </p>
          </Card>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {data.perQuestion.map((q, idx) => {
            const total = q.options.reduce((s, o) => s + o.count, 0);
            const top = q.options.reduce(
              (a, b) => (b.count > a.count ? b : a),
              q.options[0] || { count: 0, label: "" }
            );
            return (
              <Card key={q.id}>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Q{String(idx + 1).padStart(2, "0")}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {total} response{total === 1 ? "" : "s"}
                  </p>
                </div>
                <h2 className="mb-1 font-display text-2xl leading-tight tracking-tight text-ink">
                  {q.title}
                </h2>
                {top && total > 0 && (
                  <p className="mb-4 font-sans text-xs text-ink-soft">
                    Leading:{" "}
                    <span className="font-medium text-ink">{top.label}</span>{" "}
                    <span className="text-ink-muted">
                      ({Math.round((top.count / total) * 100)}%)
                    </span>
                  </p>
                )}
                <Bar
                  data={{
                    labels: q.options.map((o) => o.label),
                    datasets: [
                      {
                        label: "Responses",
                        data: q.options.map((o) => o.count),
                        backgroundColor: CHART_COLORS.bar,
                        borderColor: CHART_COLORS.barBorder,
                        borderWidth: 1,
                        borderRadius: 0,
                      },
                    ],
                  }}
                  options={CHART_OPTIONS}
                />
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
