import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { publicApi } from "../../api/public";
import { Tag, Stamp } from "../../components/ui";
import { NotifyCTA } from "../../components/NotifyCTA";
import { PublicError } from "../../components/PublicError";
import { useElectionSocket } from "../../hooks/useElectionSocket";
import { hasVotedLocally } from "../../lib/voteRecord";

export default function LandingPage() {
  const { customUrl } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    data: election,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-election", customUrl],
    queryFn: () => publicApi.getBallot(customUrl),
  });

  // Listen for live status pushes — if the admin launches/ends/publishes
  // while the visitor is sitting on this page, refetch the election so
  // the redirect logic below picks up the new state.
  const { status: liveStatus } = useElectionSocket({
    electionId: election?.id,
    customUrl,
  });

  useEffect(() => {
    if (liveStatus) {
      qc.invalidateQueries({ queryKey: ["public-election", customUrl] });
    }
  }, [liveStatus, customUrl, qc]);

  useEffect(() => {
    if (!election) return;

    if (election.resultsPublished) {
      navigate(`/e/${customUrl}/results`, { replace: true });
      return;
    }
    // Only redirect to ballot if it's accepting responses.
    const acceptingNow = election.launched && !election.ended;
    if (!acceptingNow) return;

    if (election.requiresAuth && !election.voterAuthenticated) {
      navigate(`/e/${customUrl}/voterLogin`, { replace: true });
      return;
    }
    if (election.alreadyVoted || hasVotedLocally(election.id)) {
      navigate(`/e/${customUrl}/thanks`, { replace: true });
      return;
    }
    navigate(`/e/${customUrl}/vote`, { replace: true });
  }, [election, customUrl, navigate]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Loading…
        </p>
      </main>
    );
  }
  if (error) {
    return <PublicError error={error} customUrl={customUrl} />;
  }

  const ended = election.ended;
  const awaitingPublish = ended && !election.resultsPublished;
  const notLaunched = !election.launched;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 animate-rise">
      <Link
        to="/"
        className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        ← Pulse Board
      </Link>

      <div className="mt-6">
        {awaitingPublish ? (
          <Stamp tone="coral">Counting in progress</Stamp>
        ) : (
          <Tag tone={notLaunched ? "draft" : "ended"}>
            {notLaunched ? "Not yet open" : "Ended"}
          </Tag>
        )}
      </div>

      <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.04] tracking-tight text-ink md:text-6xl">
        {election.name}
      </h1>

      {notLaunched && (
        <p className="mt-6 max-w-xl font-sans text-lg text-ink-soft">
          This poll hasn't opened yet — check back later, or get a nudge below
          and we'll email you when it goes live.
        </p>
      )}

      {awaitingPublish && (
        <p className="mt-6 max-w-xl font-sans text-lg text-ink-soft">
          Voting closed{" "}
          {election.expiresAt && (
            <>
              on <strong>{formatDate(election.expiresAt)}</strong>.{" "}
            </>
          )}
          The admin is putting together the final tally — final results land
          tomorrow morning.
        </p>
      )}

      {(awaitingPublish || notLaunched) && (
        <div className="mt-10">
          <NotifyCTA
            customUrl={customUrl}
            variant={awaitingPublish ? "awaiting" : "live"}
            resultsAt={election.expiresAt}
          />
        </div>
      )}
    </main>
  );
}

function formatDate(d) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
