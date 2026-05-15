import { lazy, Suspense } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { LiveDot } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import { docsHref } from "./lib/docsLink";

// Marketing + auth ship together in the initial bundle (visitors hit these
// first and we want the paint to feel instant).
import MarketingPage from "./pages/public/MarketingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

// Heavy admin + chart pages are lazy-loaded.
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const ElectionEditorPage = lazy(() =>
  import("./pages/admin/ElectionEditorPage")
);
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage"));
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const VoterLoginPage = lazy(() => import("./pages/public/VoterLoginPage"));
const BallotPage = lazy(() => import("./pages/public/BallotPage"));
const ThankYouPage = lazy(() => import("./pages/public/ThankYouPage"));
const ResultsPage = lazy(() => import("./pages/public/ResultsPage"));

function PageFallback() {
  return (
    <main
      className="mx-auto max-w-md px-6 py-20 text-center animate-rise"
      aria-busy="true"
    >
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
        Loading…
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<MarketingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute requires="admin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/elections/:id"
          element={
            <ProtectedRoute requires="admin">
              <ElectionEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/elections/:id/analytics"
          element={
            <ProtectedRoute requires="admin">
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/e/:customUrl" element={<LandingPage />} />
        <Route path="/e/:customUrl/voterLogin" element={<VoterLoginPage />} />
        <Route path="/e/:customUrl/vote" element={<BallotPage />} />
        <Route path="/e/:customUrl/thanks" element={<ThankYouPage />} />
        <Route path="/e/:customUrl/results" element={<ResultsPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function NotFound() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.type === "admin";

  // Special-case /docs paths. The SPA doesn't serve docs; in dev they
  // live on a different port (Astro :4321), in prod Express serves them
  // at /docs from the same origin. Either way, point the visitor at the
  // resolved URL via docsHref().
  const looksLikeDocs = location.pathname.startsWith("/docs");

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 animate-rise">
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <LiveDot />
        Pulse Board
      </Link>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        404
      </p>
      <h1 className="mt-3 font-display text-6xl font-semibold leading-[1.02] tracking-tight text-ink md:text-7xl">
        Not <em className="italic text-brand-600">found</em>.
      </h1>
      <p className="mt-5 max-w-xl font-sans text-lg text-ink-soft">
        {looksLikeDocs ? (
          <>
            Docs don&apos;t live on the SPA — they have their own home. The
            link below jumps you straight there.
          </>
        ) : (
          <>
            That URL doesn&apos;t match anything on Pulse Board. Pick a
            path below.
          </>
        )}
      </p>
      <p className="mt-3 font-mono text-xs text-ink-muted">
        You tried to open{" "}
        <code className="font-mono text-ink">{location.pathname}</code>
      </p>

      <nav
        className="mt-12 grid gap-4 border-t border-ink/15 pt-8 sm:grid-cols-2"
        aria-label="What to do next"
      >
        {looksLikeDocs ? (
          <ExitLink
            href={docsHref(location.pathname.replace(/^\/docs/, "") || "/")}
            external
            eyebrow="Documentation"
            label="Open the docs →"
            primary
          />
        ) : (
          <ExitLink
            to="/"
            eyebrow="Home"
            label="Back to Pulse Board →"
            primary
          />
        )}
        {isAdmin ? (
          <ExitLink
            to="/home"
            eyebrow="Admin"
            label="Your dashboard"
          />
        ) : (
          <ExitLink
            to="/e/q1-roadmap"
            eyebrow="Try the demo"
            label="Vote on a live poll"
          />
        )}
        {looksLikeDocs && (
          <ExitLink to="/" eyebrow="Home" label="Back to Pulse Board" />
        )}
      </nav>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        Made by Saad · x.com/developedbysaad
      </p>
    </main>
  );
}

function ExitLink({ to, href, external, eyebrow, label, primary = false }) {
  const base =
    "block border px-5 py-4 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
  const styled = primary
    ? "border-ink bg-ink text-paper hover:bg-brand-600 hover:border-brand-600"
    : "border-ink/30 bg-paper text-ink hover:border-ink";
  const content = (
    <>
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
    </>
  );
  if (external) {
    return (
      <a href={href} className={`${base} ${styled}`}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={`${base} ${styled}`}>
      {content}
    </Link>
  );
}
