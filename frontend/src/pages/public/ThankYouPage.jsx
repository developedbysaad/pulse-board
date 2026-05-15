import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { publicApi } from "../../api/public";
import { useAuth } from "../../context/AuthContext";
import { useElectionSocket } from "../../hooks/useElectionSocket";
import { NotifyCTA } from "../../components/NotifyCTA";
import { LiveDot } from "../../components/ui";

export default function ThankYouPage() {
  const { customUrl } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: election } = useQuery({
    queryKey: ["public-election", customUrl],
    queryFn: () => publicApi.getBallot(customUrl),
  });

  // Live status — when the admin publishes results while the visitor
  // is on this page, refetch the election so resultsPublished flips
  // true and the "View final results" CTA appears without a manual
  // refresh.
  const { status: liveStatus } = useElectionSocket({
    electionId: election?.id,
    customUrl,
  });

  useEffect(() => {
    if (liveStatus) {
      qc.invalidateQueries({ queryKey: ["public-election", customUrl] });
    }
  }, [liveStatus, customUrl, qc]);

  const justPublished =
    liveStatus?.resultsPublished && election && !election.resultsPublished;

  const showNotifyCTA = election && !election.resultsPublished;
  const isAdmin = user?.type === "admin";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 animate-rise">
      <Link
        to="/"
        className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        ← Pulse Board
      </Link>

      <div className="mt-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          Recorded ·{" "}
          {new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <h1 className="mt-4 font-display text-7xl font-semibold leading-none tracking-tight text-ink md:text-8xl">
          Thank <span className="italic">you</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-md font-sans text-lg text-ink-soft">
          Your response has been counted. You can close this tab — or pick a
          path below.
        </p>
      </div>

      {(justPublished || election?.resultsPublished) && (
        <aside
          role="status"
          aria-live="polite"
          className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-brand-600 bg-paper px-5 py-4 animate-rise"
        >
          <div className="flex items-center gap-3">
            <LiveDot />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-700">
                Just now
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-tight text-ink">
                The final results are live.
              </p>
            </div>
          </div>
          <Link
            to={`/e/${customUrl}/results`}
            className="border-2 border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-paper transition-colors hover:bg-brand-600 hover:border-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            View results →
          </Link>
        </aside>
      )}

      {showNotifyCTA && !justPublished && (
        <div className="mt-12">
          <NotifyCTA
            customUrl={customUrl}
            variant="voted"
            resultsAt={election.expiresAt}
          />
        </div>
      )}

      <nav className="mt-12 grid gap-4 border-t border-ink/15 pt-8 sm:grid-cols-2">
        {election?.resultsPublished && (
          <ExitLink
            to={`/e/${customUrl}/results`}
            eyebrow="See the outcome"
            label="View final results →"
            primary
          />
        )}
        {isAdmin ? (
          <ExitLink
            to="/home"
            eyebrow="Admin"
            label="Back to your dashboard →"
            primary={!election?.resultsPublished}
          />
        ) : (
          <ExitLink
            to="/signup"
            eyebrow="Run your own"
            label="Start a poll on Pulse Board →"
            primary={!election?.resultsPublished}
          />
        )}
        <ExitLink
          to="/"
          eyebrow="Home"
          label="Back to the front page"
        />
      </nav>

      <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        Made by Saad · x.com/developedbysaad
      </p>
    </main>
  );
}

function ExitLink({ to, eyebrow, label, primary = false }) {
  const base =
    "block border px-5 py-4 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
  const styled = primary
    ? "border-ink bg-ink text-paper hover:bg-brand-600 hover:border-brand-600"
    : "border-ink/30 bg-paper text-ink hover:border-ink";
  return (
    <Link to={to} className={`${base} ${styled}`}>
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
          primary ? "text-paper/70" : "text-ink-muted"
        }`}
      >
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight">
        {label}
      </p>
    </Link>
  );
}
