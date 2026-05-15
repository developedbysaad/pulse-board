import { Link } from "react-router-dom";
import { LiveDot, Stamp } from "./ui";

/**
 * Full-page error state for public flows (LandingPage, BallotPage,
 * VoterLoginPage, ResultsPage, ThankYouPage).
 *
 * Maps an axios-style error into a clear headline + actionable copy +
 * exit CTAs, so a confused link never dead-ends.
 */
export function PublicError({ error, customUrl, defaultTitle }) {
  const status = error?.response?.status;
  const serverMsg = error?.response?.data?.error;

  const view = mapError({ status, serverMsg, defaultTitle });

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 animate-rise">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <LiveDot />
        Pulse Board
      </Link>

      <div className="mt-8">
        <Stamp tone={view.stampTone}>{view.eyebrow}</Stamp>
      </div>

      <h1 className="mt-6 font-display text-6xl font-semibold leading-[1.02] tracking-tight text-ink md:text-7xl">
        {view.title}
      </h1>

      <p className="mt-6 max-w-xl font-sans text-lg text-ink-soft">
        {view.body}
      </p>

      {view.detail && (
        <p className="mt-3 font-mono text-sm text-ink-muted">
          <span className="font-medium text-ink-soft">Details:</span>{" "}
          {view.detail}
        </p>
      )}

      {customUrl && (
        <p className="mt-3 font-mono text-xs text-ink-muted">
          You tried to open{" "}
          <code className="font-mono text-ink">/e/{customUrl}</code>
        </p>
      )}

      <nav
        className="mt-12 grid gap-4 border-t border-ink/15 pt-8 sm:grid-cols-2"
        aria-label="What to do next"
      >
        <ExitLink
          to="/"
          eyebrow="Home"
          label="Back to Pulse Board →"
          primary
        />
        <ExitLink
          to="/e/q1-roadmap"
          eyebrow="Try the demo"
          label="Vote on a live poll"
        />
        {view.canRetry && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="block border border-ink/30 bg-paper px-5 py-4 text-left transition-colors hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:col-span-2"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              Or
            </p>
            <p className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
              Refresh this page ↻
            </p>
          </button>
        )}
      </nav>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
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

function mapError({ status, serverMsg, defaultTitle }) {
  // Network / no-response (offline, server down)
  if (!status) {
    return {
      stampTone: "ink",
      eyebrow: "Connection lost",
      title: "We couldn't reach the server.",
      body:
        "Check your internet connection and try again. If you're on an unstable network, refreshing usually helps.",
      detail: serverMsg,
      canRetry: true,
    };
  }

  // 400 — usually means the URL slug doesn't pass our validation
  if (status === 400) {
    return {
      stampTone: "coral",
      eyebrow: "Unrecognised link",
      title: "That doesn't look like a valid poll link.",
      body:
        "Polls live at /e/<slug>. Slugs are 2+ characters and use letters, numbers, dashes, or underscores. Double-check the link, or pick something below.",
      detail: serverMsg,
      canRetry: false,
    };
  }

  if (status === 403) {
    const isCsrf = /csrf|session expired|refresh/i.test(serverMsg || "");
    if (isCsrf) {
      return {
        stampTone: "coral",
        eyebrow: "Session reset",
        title: "Your session was reset.",
        body:
          "This usually happens when another tab signed out, or the server restarted. Refresh the page and you'll be back in.",
        detail: serverMsg,
        canRetry: true,
      };
    }
    return {
      stampTone: "coral",
      eyebrow: "Not allowed",
      title: "You don't have access to this poll.",
      body:
        "This ballot is restricted to pre-registered voters. Use the credentials you were issued, or ask the poll's admin for a fresh link.",
      detail: serverMsg,
      canRetry: false,
    };
  }

  if (status === 404) {
    return {
      stampTone: "coral",
      eyebrow: "Not found",
      title: defaultTitle || "We couldn't find that poll.",
      body:
        "It may have been deleted, or the slug in the URL doesn't match anything. Try the live demo below, or head back to the front page.",
      detail: serverMsg,
      canRetry: false,
    };
  }

  if (status === 429) {
    return {
      stampTone: "coral",
      eyebrow: "Slow down",
      title: "Too many requests.",
      body:
        "You've hit the rate limit. Take a breath and try again in a minute.",
      detail: serverMsg,
      canRetry: true,
    };
  }

  if (status >= 500) {
    return {
      stampTone: "ink",
      eyebrow: "Server error",
      title: "Something broke on our side.",
      body:
        "Not your fault. We're probably already on it. Refresh in a moment, or come back shortly.",
      detail: serverMsg,
      canRetry: true,
    };
  }

  // Default fallback
  return {
    stampTone: "coral",
    eyebrow: `Error ${status}`,
    title: defaultTitle || "Something went wrong.",
    body:
      "We hit an unexpected error loading this page. Try refreshing, or pick a path below.",
    detail: serverMsg,
    canRetry: true,
  };
}
