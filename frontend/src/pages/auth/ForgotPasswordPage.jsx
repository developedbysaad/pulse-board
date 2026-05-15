import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authApi } from "../../api/auth";
import { Banner, LiveDot, Stamp } from "../../components/ui";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState(null);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
    } catch (err) {
      setServerError(
        err.response?.data?.error || "Couldn't send the reset link, try again."
      );
    }
  };

  const today = new Date()
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, ".");

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5"
        aria-label="Pulse Board"
      >
        <Link
          to="/"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink"
        >
          <LiveDot />
          Pulse Board
        </Link>
        <Link
          to="/login"
          className="border-2 border-ink bg-paper px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to sign in →
        </Link>
      </nav>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div
          className="paper-grain relative w-full max-w-md animate-rise border border-ink bg-paper p-10"
          style={{ boxShadow: "8px 8px 0 0 var(--color-ink)" }}
        >
          <span className="absolute -right-4 -top-4 z-10">
            <Stamp tone="coral">Locked out</Stamp>
          </span>

          <div className="relative z-10">
            <div className="mb-6 flex items-baseline justify-between border-b border-ink/30 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Form C · Password recovery
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                {today}
              </span>
            </div>

            {submittedEmail ? (
              <>
                <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
                  Check your<br />
                  <span className="italic">inbox</span>.
                </h1>
                <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
                  If an account exists for <strong>{submittedEmail}</strong>,
                  we've sent a one-time link there. It works once and expires
                  in 15 minutes.
                </p>
                <p className="mt-6 font-sans text-sm text-ink-muted">
                  Didn't see it? Check spam, or{" "}
                  <button
                    type="button"
                    onClick={() => setSubmittedEmail(null)}
                    className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand-600 underline-offset-4 hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
                  Forgot your<br />
                  <span className="italic">password</span>?
                </h1>
                <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
                  Drop the email on your admin account below. We'll send a
                  one-time link that lets you set a new one — good for 15
                  minutes.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
                  {serverError && <Banner kind="error">{serverError}</Banner>}

                  <FormLine
                    label="Email"
                    error={errors.email?.message}
                    inputProps={{
                      type: "email",
                      autoComplete: "email",
                      placeholder: "you@example.com",
                      ...register("email"),
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="stamp-btn mt-4 w-full border-2 border-ink bg-brand-600 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending…" : "Send reset link →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          Pulse Board · The Polling Daily
        </p>
        <a
          href="https://x.com/developedbysaad"
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Made by Saad ↗
        </a>
      </footer>
    </main>
  );
}

function FormLine({ label, error, inputProps }) {
  return (
    <label className="mb-7 block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          {label}
        </span>
        {error && (
          <span className="font-hand text-base text-rose-soft">{error}</span>
        )}
      </div>
      <input
        {...inputProps}
        className="line-underline mt-1 w-full font-sans text-lg text-ink placeholder:text-ink-faint focus:border-brand-600"
      />
    </label>
  );
}
