import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  LiveDot,
  Stamp,
  TallyMark,
} from "../../components/ui";
import { docsHref } from "../../lib/docsLink";

const TICKER_ITEMS = [
  "vote recorded · #00742 · 2s ago",
  "vote recorded · alice@team · 4s ago",
  "Q3 product survey ended at 14:02",
  "vote recorded · #00741 · 7s ago",
  "Pulse Board v1 — 2 482 polls live this week",
  "vote recorded · anon · 9s ago",
  "results published · town-hall-may",
  "vote recorded · bob@team · 12s ago",
];

const DEMO_QUESTION = "What should we ship next?";
const DEMO_OPTIONS = [
  { label: "React Native app", count: 38 },
  { label: "Slack integration", count: 27 },
  { label: "Public REST API", count: 19 },
  { label: "CSV export", count: 11 },
];

export default function MarketingPage() {
  const { user } = useAuth();
  if (user?.type === "admin") return <Navigate to="/home" replace />;

  const [counts, setCounts] = useState(DEMO_OPTIONS.map((o) => o.count));
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts, 1);

  useEffect(() => {
    const id = setInterval(() => {
      setCounts((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        next[i] = next[i] + 1;
        return next;
      });
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <TopBar />

      {/* MASTHEAD */}
      <section className="relative border-b-2 border-double border-ink/40">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-12 md:pt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink/30 pb-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-soft">
                Vol. I · No. 01
              </span>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.24em] text-ink-faint md:inline">
                — Live polling, plain paper
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-soft">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="grid gap-10 pt-10 md:grid-cols-[1.5fr_1fr] md:items-end stagger">
            <div>
              <Stamp tone="coral" className="mb-6">
                Counted in real time
              </Stamp>
              <h1 className="font-display text-[clamp(3rem,9vw,7.5rem)] font-semibold leading-[0.92] tracking-[-0.025em] text-ink">
                Hand-counted{" "}
                <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}>
                  ballots
                </span>
                ,
                <br />
                <span className="text-brand-600">second by second.</span>
              </h1>
              <p className="mt-8 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
                Pulse Board is a real-time polling platform for teams that
                actually want to{" "}
                <span className="border-b-2 border-brand-500 pb-0.5 text-ink">
                  watch the room think
                </span>
                . Build a poll, share one link, and let the dashboard fill in as
                votes arrive.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button as={Link} to="/signup" size="lg" className="stamp-btn">
                  Start a poll →
                </Button>
                <Link
                  to="/e/q1-roadmap"
                  className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  <LiveDot />
                  Vote on the live demo
                </Link>
              </div>
            </div>

            <DemoCard
              question={DEMO_QUESTION}
              options={DEMO_OPTIONS}
              counts={counts}
              total={total}
              max={max}
            />
          </div>
        </div>

        {/* live ticker */}
        <Ticker items={TICKER_ITEMS} />
      </section>

      {/* SECTION 02 — THREE PILLARS */}
      <section className="border-b border-ink/15 bg-paper-dim">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6 border-b border-ink/30 pb-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-soft">
                §02 · What's in the box
              </p>
              <h2 className="mt-2 font-display text-5xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
                Three things,{" "}
                <span className="italic">done well</span>.
              </h2>
            </div>
            <p className="max-w-md font-sans text-base text-ink-soft">
              No bloat. The app is a tight loop —
              <em> compose · launch · count</em> — and everything orbits
              around that.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 stagger">
            {[
              {
                n: "01",
                title: "Compose",
                tally: 3,
                body: "Drag in questions, mark required ones, set an expiry. Anonymous link or pre-registered voters.",
              },
              {
                n: "02",
                title: "Launch",
                tally: 7,
                body: "One click freezes the ballot and opens the public link. Locked questions, signed CSRF tokens, rate-limited submissions.",
              },
              {
                n: "03",
                title: "Count",
                tally: 12,
                body: "WebSocket-pushed analytics. Bars race as votes arrive. Publish the final tally to the same URL.",
              },
            ].map((p) => (
              <Pillar key={p.n} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 03 — HOW IT WORKS (NUMBERED COLUMN) */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-soft">
              §03 · Three minutes to first vote
            </p>
            <h2 className="mt-2 font-display text-5xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
              From <span className="italic">draft</span> to first
              <span className="text-brand-600"> ballot</span>.
            </h2>
          </div>

          <ol className="grid gap-10 md:grid-cols-3 stagger">
            {[
              {
                n: "1",
                t: "Sign in.",
                b: "Email + 8-character password. No SSO theatre.",
              },
              {
                n: "2",
                t: "Compose your ballot.",
                b: "Add radio questions, mark required, optionally pre-register voters with a one-time password.",
              },
              {
                n: "3",
                t: "Share one link.",
                b: "Watch /e/<your-slug> fill in. End the poll, publish results, the same URL becomes the public archive.",
              },
            ].map((s, i) => (
              <li
                key={s.n}
                className="relative border-t border-ink/30 pt-6"
              >
                <span className="absolute -top-7 left-0 font-display text-7xl font-semibold leading-none text-brand-500">
                  {s.n}
                </span>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
                  {s.t}
                </h3>
                <p className="mt-2 font-sans text-base text-ink-soft">{s.b}</p>
                {i < 2 && (
                  <span
                    className="absolute right-0 top-12 hidden font-hand text-3xl text-brand-600 md:block"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECTION 04 — STATS BAR */}
      <section className="border-b border-ink/15 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 py-14 md:grid-cols-4">
          {[
            { v: "<300ms", k: "Vote → dashboard latency" },
            { v: "1 link", k: "Public URL per poll" },
            { v: "0", k: "Tracking cookies on the public ballot" },
            { v: "MIT", k: "Source license" },
          ].map((s) => (
            <div key={s.k} className="border-l-2 border-paper/30 pl-5">
              <p className="font-display text-4xl font-semibold tracking-tight text-paper md:text-5xl">
                {s.v}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.24em] text-paper/70">
                {s.k}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 05 — FINAL CTA */}
      <section className="relative">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <Stamp tone="coral" className="mb-6">
            Issue closes
          </Stamp>
          <h2 className="font-display text-6xl font-semibold leading-[0.95] tracking-tight text-ink md:text-8xl">
            Your first poll
            <br />
            takes <span className="italic">three minutes</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-lg font-sans text-lg text-ink-soft">
            And the second one takes thirty seconds — because by then
            you'll know the routine.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button as={Link} to="/signup" size="lg" className="stamp-btn">
              Create an account →
            </Button>
            <Button as={Link} to="/login" variant="secondary" size="lg">
              I already have one
            </Button>
          </div>
          <p className="mt-6 font-sans text-base text-ink-muted">
            Or peek at the live demo at{" "}
            <Link
              to="/e/q1-roadmap"
              className="font-mono text-ink underline decoration-brand-500 decoration-2 underline-offset-4 hover:text-brand-600"
            >
              /e/q1-roadmap
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-double border-ink/40 bg-paper-dim">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-3xl font-semibold tracking-tight text-ink">
              Pulse Board
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Vol. I · The Polling Daily · MIT-licensed
            </p>
            <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
              An open-source real-time polling platform. Self-host it in
              fifteen minutes; the docs are built in.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Get going
            </p>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              <li>
                <Link to="/signup" className="text-ink underline-offset-4 hover:underline">
                  Create an account
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-ink underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/e/q1-roadmap" className="text-ink underline-offset-4 hover:underline">
                  Try the live demo
                </Link>
              </li>
              <li>
                <a href={docsHref("/")} className="text-ink underline-offset-4 hover:underline">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Made by
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">
              Mohd Saad
            </p>
            <a
              href="https://x.com/developedbysaad"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              x.com/developedbysaad ↗
            </a>
            <p className="mt-3 font-hand text-xl text-ink-soft">
              Stopwatch, inkpot, browser.
            </p>
          </div>
        </div>

        <div className="border-t border-ink/15">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              © {new Date().getFullYear()} Pulse Board · MIT
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              v1 · Live polling, plain paper
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-30 border-b border-ink/15 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink"
        >
          <LiveDot />
          Pulse Board
        </Link>
        <nav className="flex items-center gap-5">
          <a
            href={docsHref("/")}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Docs
          </a>
          <Link
            to="/login"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-paper transition-colors hover:bg-brand-600 hover:border-brand-600"
          >
            Get started →
          </Link>
        </nav>
      </div>
    </div>
  );
}

function DemoCard({ question, options, counts, total, max }) {
  return (
    <div
      className="paper-grain relative animate-rise border border-ink bg-paper p-6"
      style={{ boxShadow: "6px 6px 0 0 var(--color-ink)" }}
    >
      <div className="relative z-10">
        <div className="mb-4 flex items-baseline justify-between border-b border-ink/30 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Live ballot · /e/q1-roadmap
          </p>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brand-600">
            <LiveDot />
            counting
          </p>
        </div>
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
          {question}
        </h3>
        <ul className="mt-5 space-y-4">
          {options.map((o, i) => {
            const c = counts[i];
            const pct = max ? (c / max) * 100 : 0;
            const totalPct = total ? Math.round((c / total) * 100) : 0;
            return (
              <li key={o.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-sans text-sm font-medium text-ink">
                    {o.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ink-soft">
                    {c} <span className="text-ink-faint">· {totalPct}%</span>
                  </span>
                </div>
                <div className="relative h-3 w-full border border-ink/15 bg-paper-deep">
                  <div
                    className="absolute inset-y-0 left-0 origin-left bg-brand-500"
                    style={{
                      width: `${pct}%`,
                      animation: "bar-grow 1s cubic-bezier(.2,.8,.2,1) both",
                      animationDelay: `${0.1 + i * 0.12}s`,
                      transition: "width 0.6s cubic-bezier(.2,.8,.2,1)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-ink/15 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Total
          </span>
          <span className="font-display text-3xl font-semibold tabular-nums text-ink">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function Pillar({ n, title, tally, body }) {
  return (
    <div className="relative border border-ink/20 bg-paper p-6 transition-colors hover:border-ink/60">
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          §{n}
        </span>
        <span className="text-brand-600">
          <TallyMark count={tally} />
        </span>
      </div>
      <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-3 font-sans text-base text-ink-soft">{body}</p>
    </div>
  );
}

function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-ink bg-ink py-2 text-paper">
      <div
        className="flex gap-10 whitespace-nowrap"
        style={{ animation: "marquee 38s linear infinite" }}
      >
        {doubled.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/85"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
