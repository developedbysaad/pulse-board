import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { electionsApi } from "../../api/elections";
import { Header } from "../../components/Header";
import { ShareLink } from "../../components/ShareLink";
import { Button, Banner, Tag } from "../../components/ui";
import QuestionsTab from "./tabs/QuestionsTab";
import VotersTab from "./tabs/VotersTab";
import SettingsTab from "./tabs/SettingsTab";

const TABS = [
  { key: "questions", label: "Questions" },
  { key: "voters", label: "Voters" },
  { key: "settings", label: "Settings" },
];

function statusFor(e) {
  if (e.resultsPublished) return { tone: "published", label: "Published" };
  if (e.ended) return { tone: "ended", label: "Ended" };
  if (e.launched) return { tone: "live", label: "Live" };
  return { tone: "draft", label: "Draft" };
}

export default function ElectionEditorPage() {
  const { id } = useParams();
  const electionId = Number(id);
  const [tab, setTab] = useState("questions");
  const qc = useQueryClient();

  const {
    data: election,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["election", electionId],
    queryFn: () => electionsApi.get(electionId),
  });

  const launchMut = useMutation({
    mutationFn: () => electionsApi.launch(electionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["election", electionId] }),
  });
  const endMut = useMutation({
    mutationFn: () => electionsApi.end(electionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["election", electionId] }),
  });
  const publishMut = useMutation({
    mutationFn: () => electionsApi.publish(electionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["election", electionId] }),
  });

  const visibleTabs = useMemo(
    () =>
      TABS.filter((t) => t.key !== "voters" || election?.mode === "authenticated"),
    [election?.mode]
  );

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

  if (error || !election) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Banner kind="error">
            {error?.response?.data?.error || "Election not found"}
          </Banner>
          <Link
            to="/home"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  const status = statusFor(election);

  const mutErr =
    launchMut.error?.response?.data?.error ||
    endMut.error?.response?.data?.error ||
    publishMut.error?.response?.data?.error;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/home"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← All polls
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-6 border-b border-ink/15 pb-8">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Tag tone={status.tone}>{status.label}</Tag>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                {election.mode === "anonymous"
                  ? "Anonymous"
                  : "Authenticated"}
              </span>
              {election.expiresAt && (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Expires{" "}
                  {new Date(election.expiresAt).toLocaleDateString()}{" "}
                  {new Date(election.expiresAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-ink md:text-6xl">
              {election.name}
            </h1>
            {election.customUrl && (
              <div className="mt-4 max-w-xl">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                  Public link
                </p>
                <ShareLink
                  path={`/e/${election.customUrl}`}
                  title={`Vote: ${election.name}`}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!election.launched && (
              <Button
                onClick={() => launchMut.mutate()}
                disabled={launchMut.isPending}
                size="lg"
              >
                {launchMut.isPending ? "Launching…" : "Launch poll →"}
              </Button>
            )}
            {election.launched && !election.ended && (
              <>
                <Button
                  as={Link}
                  to={`/elections/${electionId}/analytics`}
                  variant="primary"
                  size="lg"
                >
                  Live analytics →
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (
                      confirm(
                        `End "${election.name}" now? This stops accepting responses and can't be undone.`
                      )
                    )
                      endMut.mutate();
                  }}
                  disabled={endMut.isPending}
                >
                  {endMut.isPending ? "Ending…" : "End poll"}
                </Button>
              </>
            )}
            {election.ended && !election.resultsPublished && (
              <Button
                onClick={() => {
                  if (
                    confirm(
                      `Publish results for "${election.name}"? Anyone with the link will see the final tally.`
                    )
                  )
                    publishMut.mutate();
                }}
                disabled={publishMut.isPending}
                variant="accent"
                size="lg"
              >
                {publishMut.isPending ? "Publishing…" : "Publish results →"}
              </Button>
            )}
            {election.resultsPublished && (
              <Button
                as={Link}
                to={`/e/${election.customUrl}/results`}
                variant="secondary"
                target="_blank"
                rel="noreferrer"
              >
                View public results ↗
              </Button>
            )}
          </div>
        </header>

        {mutErr && (
          <div className="mt-6">
            <Banner kind="error">{mutErr}</Banner>
          </div>
        )}

        <div className="mt-8 mb-6 flex gap-1 border-b border-ink/15">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px border-b-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                tab === t.key
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="animate-rise">
          {tab === "questions" && <QuestionsTab election={election} />}
          {tab === "voters" && <VotersTab election={election} />}
          {tab === "settings" && <SettingsTab election={election} />}
        </div>
      </main>
    </>
  );
}
