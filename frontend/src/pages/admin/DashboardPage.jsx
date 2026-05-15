import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { electionsApi } from "../../api/elections";
import { Header } from "../../components/Header";
import { ShareLink } from "../../components/ShareLink";
import { SlugField } from "../../components/SlugField";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Banner,
  Tag,
  Stat,
  Divider,
} from "../../components/ui";
import { slugify } from "../../lib/slugify";

function statusFor(e) {
  if (e.resultsPublished) return { tone: "published", label: "Published" };
  if (e.ended) return { tone: "ended", label: "Ended" };
  if (e.launched) return { tone: "live", label: "Live" };
  return { tone: "draft", label: "Draft" };
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const {
    data: elections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["elections"],
    queryFn: electionsApi.list,
  });

  const [name, setName] = useState("");
  const [mode, setMode] = useState("authenticated");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [slug, setSlug] = useState("");
  const [slugMode, setSlugMode] = useState("auto"); // "auto" | "manual"
  const [slugStatus, setSlugStatus] = useState({ state: "idle" });

  // In auto mode, derive the slug from the typed name. In manual mode,
  // the user owns it.
  const derivedSlug = slugMode === "auto" ? slugify(name) : slug;

  const createMut = useMutation({
    mutationFn: (data) => electionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
      setName("");
      setSlug("");
      setSlugMode("auto");
      setCreating(false);
      setCreateError(null);
    },
    onError: (e) => setCreateError(e.response?.data?.error || "Failed to create"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => electionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["elections"] }),
  });

  const live = elections.filter((e) => e.launched && !e.ended).length;
  const drafts = elections.filter((e) => !e.launched).length;
  const archived = elections.filter((e) => e.ended).length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-12 grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Studio
            </p>
            <h1 className="mt-2 font-display text-6xl leading-[1.02] tracking-tight text-ink md:text-7xl">
              Your <em className="italic text-brand-600">polls</em>.
            </h1>
            <p className="mt-4 max-w-xl font-sans text-base text-ink-soft">
              Drafts, live ballots, and published results — all in one place.
              Open one to edit, launch, watch responses arrive, or publish the
              final tally.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-ink/15 pt-6">
            <Stat label="Live" value={live} />
            <Stat label="Drafts" value={drafts} />
            <Stat label="Archive" value={archived} />
          </dl>
        </section>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">
            <em className="italic">All</em> polls
            <span className="ml-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              {elections.length} total
            </span>
          </h2>
          <Button onClick={() => setCreating((v) => !v)} variant="primary">
            {creating ? "Cancel" : "+ New poll"}
          </Button>
        </div>

        {creating && (
          <Card className="mb-8 animate-rise">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Compose
            </p>
            {createError && <Banner kind="error">{createError}</Banner>}
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Poll name">
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Q1 product survey"
                />
              </Field>
              <Field label="Response mode">
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="authenticated">
                    Authenticated · pre-registered voters
                  </option>
                  <option value="anonymous">Anonymous · open link</option>
                </Select>
              </Field>
            </div>

            {name.trim() && (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    Public link
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (slugMode === "auto") {
                        setSlug(derivedSlug);
                        setSlugMode("manual");
                      } else {
                        setSlugMode("auto");
                      }
                    }}
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    {slugMode === "auto" ? "Customise →" : "Use auto slug"}
                  </button>
                </div>
                <SlugField
                  value={derivedSlug}
                  onChange={setSlug}
                  mode={slugMode}
                  derivedFrom={name}
                  onStatusChange={setSlugStatus}
                />
              </div>
            )}

            <Divider className="my-5" />
            <div className="flex justify-end">
              <Button
                disabled={
                  !name.trim() ||
                  createMut.isPending ||
                  slugStatus.state === "checking" ||
                  slugStatus.state === "unavailable" ||
                  slugStatus.state === "invalid"
                }
                onClick={() =>
                  createMut.mutate({
                    name: name.trim(),
                    mode,
                    customUrl: derivedSlug,
                  })
                }
              >
                {createMut.isPending ? "Creating…" : "Create poll →"}
              </Button>
            </div>
          </Card>
        )}

        {error && (
          <Banner kind="error">
            {error.response?.data?.error || error.message}
          </Banner>
        )}

        {isLoading && (
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
            Loading…
          </p>
        )}

        {!isLoading && elections.length === 0 && (
          <Card className="py-16 text-center">
            <p className="font-display text-3xl italic text-ink-soft">
              No polls yet.
            </p>
            <p className="mt-2 font-sans text-sm text-ink-muted">
              Click <em>+ New poll</em> above to compose your first one.
            </p>
          </Card>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {elections.map((e) => {
            const status = statusFor(e);
            return (
              <Card key={e.id} className="group flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <Tag tone={status.tone}>{status.label}</Tag>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      #{String(e.id).padStart(3, "0")}
                    </span>
                  </div>
                  <h3 className="font-display text-3xl leading-tight tracking-tight text-ink">
                    {e.name}
                  </h3>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                    {e.mode === "anonymous"
                      ? "Open · anonymous"
                      : "Closed · voter login"}
                  </p>
                  {e.customUrl && (
                    <div className="mt-4">
                      <ShareLink
                        path={`/e/${e.customUrl}`}
                        title={`Vote: ${e.name}`}
                        size="compact"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/15 pt-4">
                  <Button
                    as={Link}
                    to={`/elections/${e.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  {e.launched && (
                    <Button
                      as={Link}
                      to={`/elections/${e.id}/analytics`}
                      variant="primary"
                      size="sm"
                    >
                      Analytics →
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      if (confirm(`Delete "${e.name}"?`)) deleteMut.mutate(e.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
