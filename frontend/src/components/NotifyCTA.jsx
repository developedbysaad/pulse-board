import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { publicApi } from "../api/public";
import { Banner, LiveDot } from "./ui";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/**
 * Smart inline CTA — captures an email so we can email/notify when
 * results land for this poll. Shown on:
 *   - LandingPage (live poll, before voting)
 *   - ThankYouPage (after voting, results not yet out)
 *   - ResultsPage (final results — invite signup as admin)
 *
 * Variants pick copy + headline appropriate to context.
 */
export function NotifyCTA({
  customUrl,
  variant = "live",
  resultsAt,
}) {
  const copy = COPY[variant];
  const [state, setState] = useState({ status: "idle", message: null });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    setState({ status: "idle", message: null });
    try {
      const data = await publicApi.subscribe(customUrl, email);
      setState({ status: "ok", message: data.message });
      reset();
    } catch (err) {
      setState({
        status: "err",
        message:
          err.response?.data?.error ||
          err.response?.data?.details?.[0]?.message ||
          "Couldn't subscribe right now. Please try again.",
      });
    }
  };

  return (
    <aside
      className="paper-grain relative border border-ink bg-paper p-6 md:p-8"
      style={{ boxShadow: "6px 6px 0 0 var(--color-ink)" }}
    >
      <div className="relative z-10 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-700">
            <LiveDot />
            {copy.eyebrow}
          </p>
          <h3 className="mt-2 font-display text-3xl font-semibold leading-[1.05] tracking-tight text-ink md:text-4xl">
            {copy.title}
          </h3>
          <p className="mt-3 max-w-md font-sans text-base text-ink-soft">
            {copy.body}{" "}
            {resultsAt && (
              <span className="font-medium text-ink">
                Announcement: {formatDate(resultsAt)}.
              </span>
            )}
          </p>
        </div>

        {state.status === "ok" ? (
          <Banner kind="success">{state.message}</Banner>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-2"
          >
            <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
              Email
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@team.com"
                {...register("email")}
                className="line-underline flex-1 font-sans text-base text-ink placeholder:text-ink-faint focus:border-brand-600"
                aria-invalid={errors.email ? "true" : "false"}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="stamp-btn shrink-0 border-2 border-ink bg-brand-600 px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
              >
                {isSubmitting ? "Sending…" : copy.cta}
              </button>
            </div>
            {errors.email && (
              <p className="font-hand text-base text-rose-soft">
                {errors.email.message}
              </p>
            )}
            {state.status === "err" && (
              <p className="font-sans text-sm text-rose-soft">
                {state.message}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
              One email when results land · unsubscribe anytime
            </p>
          </form>
        )}
      </div>
    </aside>
  );
}

const COPY = {
  live: {
    eyebrow: "Closing soon",
    title: "Want a heads-up when the results drop?",
    body:
      "Drop your email and we'll send the final tally the moment this poll wraps.",
    cta: "Notify me →",
  },
  awaiting: {
    eyebrow: "Counting in progress",
    title: "Be the first to see the outcome.",
    body:
      "Voting is closed. We'll email the published results so you don't have to keep refreshing.",
    cta: "Notify me →",
  },
  voted: {
    eyebrow: "Vote recorded",
    title: "We'll close the loop with you.",
    body:
      "Your response is counted. Add your email and we'll send the final outcome straight to your inbox.",
    cta: "Notify me →",
  },
  results: {
    eyebrow: "Liked the format?",
    title: "Run your own poll in three minutes.",
    body:
      "Pulse Board is free and open source. Sign up to compose your own ballot, share one link, and watch the room respond.",
    cta: "Subscribe →",
  },
};

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
