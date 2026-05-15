import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { publicApi } from "../../api/public";
import { Button, Card, Banner, Tag } from "../../components/ui";
import { PublicError } from "../../components/PublicError";
import {
  hasVotedLocally,
  markVotedLocally,
} from "../../lib/voteRecord";

export default function BallotPage() {
  const { customUrl } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [missing, setMissing] = useState(new Set());

  const {
    data: election,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-election", customUrl],
    queryFn: () => publicApi.getBallot(customUrl),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Loading…
        </p>
      </main>
    );
  }
  if (error) {
    return <PublicError error={error} customUrl={customUrl} />;
  }

  if (!election.isAcceptingResponses) {
    return (
      <PublicError
        error={{
          response: {
            status: 403,
            data: {
              error:
                "Voting on this poll has closed. Results may be published soon.",
            },
          },
        }}
        customUrl={customUrl}
        defaultTitle="Voting is closed."
      />
    );
  }
  if (election.requiresAuth && !election.voterAuthenticated) {
    navigate(`/e/${customUrl}/voterLogin`, { replace: true });
    return null;
  }
  // Either signal sends them to the thank-you page: server-side
  // (session/ipHash) or client-side (localStorage from a prior submit).
  if (election.alreadyVoted || hasVotedLocally(election.id)) {
    navigate(`/e/${customUrl}/thanks`, { replace: true });
    return null;
  }

  const select = (qid, oid) => {
    setAnswers((prev) => ({ ...prev, [qid]: oid }));
    setMissing((prev) => {
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const missingNow = new Set(
      election.questions
        .filter((q) => q.isRequired && !answers[q.id])
        .map((q) => q.id)
    );
    if (missingNow.size > 0) {
      setMissing(missingNow);
      return;
    }

    const payload = Object.entries(answers).map(([qid, oid]) => ({
      questionId: Number(qid),
      optionId: Number(oid),
    }));

    setSubmitting(true);
    try {
      await publicApi.submit(customUrl, payload);
      markVotedLocally(election.id);
      navigate(`/e/${customUrl}/thanks`, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      // 409 from the server means we already voted — same destination
      // as a fresh submit, just without the localStorage write since
      // the server says we're already there.
      if (status === 409) {
        markVotedLocally(election.id);
        navigate(`/e/${customUrl}/thanks`, { replace: true });
        return;
      }
      setServerError(msg || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const total = election.questions.length;
  const answered = Object.keys(answers).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 animate-rise">
      <header className="mb-10 border-b border-ink/15 pb-8">
        <Tag tone="live" className="mb-4">
          Ballot
        </Tag>
        <h1 className="font-display text-5xl leading-[1.04] tracking-tight text-ink">
          {election.name}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {answered} / {total} answered · select one option per question
        </p>
      </header>

      {serverError && <Banner kind="error">{serverError}</Banner>}

      <form onSubmit={submit} className="space-y-6">
        {election.questions.map((q, idx) => (
          <Card
            key={q.id}
            className={missing.has(q.id) ? "border-rose-soft" : ""}
          >
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Q{String(idx + 1).padStart(2, "0")}
                {q.isRequired && (
                  <span className="ml-2 text-brand-600">· required</span>
                )}
              </p>
              <h2 className="mt-1 font-display text-2xl leading-tight tracking-tight text-ink">
                {q.title}
              </h2>
              {q.description && (
                <p className="mt-2 font-sans text-sm text-ink-soft">
                  {q.description}
                </p>
              )}
              {missing.has(q.id) && (
                <p className="mt-2 font-sans text-sm font-medium text-rose-soft">
                  Please pick an option to continue.
                </p>
              )}
            </div>
            <div className="space-y-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.id;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-3 border px-4 py-3 transition-all ${
                      selected
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/15 bg-paper hover:border-ink/40 hover:bg-paper-dim"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={selected}
                      onChange={() => select(q.id, o.id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span className="font-sans text-base">{o.label}</span>
                  </label>
                );
              })}
            </div>
          </Card>
        ))}

        <div className="flex items-center justify-between border-t border-ink/15 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            One submission per voter.
          </p>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Submitting…" : "Cast vote →"}
          </Button>
        </div>
      </form>
    </main>
  );
}
