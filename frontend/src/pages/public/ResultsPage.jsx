import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

import { publicApi } from "../../api/public";
import { Card, Stat, Tag } from "../../components/ui";
import { NotifyCTA } from "../../components/NotifyCTA";
import { PublicError } from "../../components/PublicError";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_OPTIONS = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(34, 32, 29, 1)",
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
        color: "rgba(34, 32, 29, 0.45)",
        font: { family: "JetBrains Mono", size: 10 },
      },
      grid: { color: "rgba(34, 32, 29, 0.08)", drawBorder: false },
    },
    x: {
      ticks: {
        color: "rgba(34, 32, 29, 0.45)",
        font: { family: "Inter", size: 11 },
      },
      grid: { display: false },
    },
  },
};

export default function ResultsPage() {
  const { customUrl } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["results", customUrl],
    queryFn: () => publicApi.getResults(customUrl),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Loading…
        </p>
      </main>
    );
  }
  if (error) {
    return (
      <PublicError
        error={error}
        customUrl={customUrl}
        defaultTitle="Results aren't available."
      />
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 animate-rise">
      <header className="mb-10 grid gap-8 border-b border-ink/15 pb-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <Tag tone="published" className="mb-3">
            Final results
          </Tag>
          <h1 className="font-display text-5xl leading-[1.04] tracking-tight text-ink md:text-6xl">
            {data.election.name}
          </h1>
        </div>
        <Stat
          label="Total responses"
          value={data.totalResponses}
          align="right"
        />
      </header>

      <div className="mb-10">
        <NotifyCTA customUrl={customUrl} variant="results" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {data.results.map((q, idx) => {
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
                  Winner:{" "}
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
                      backgroundColor: "rgba(42, 45, 109, 0.85)",
                      borderColor: "rgba(28, 30, 80, 1)",
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
  );
}
