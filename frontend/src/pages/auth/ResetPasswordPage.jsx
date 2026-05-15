import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authApi } from "../../api/auth";
import { Banner, LiveDot, Stamp } from "../../components/ui";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(200, "Too long"),
    confirm: z.string().min(1, "Repeat the password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(false);

  const missingToken = useMemo(() => token.length < 20, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setServerError(
        err.response?.data?.error ||
          "We couldn't reset your password. The link may have expired — try again."
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
            <Stamp tone="coral">Set new password</Stamp>
          </span>

          <div className="relative z-10">
            <div className="mb-6 flex items-baseline justify-between border-b border-ink/30 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Form D · Reset password
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                {today}
              </span>
            </div>

            {missingToken ? (
              <>
                <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
                  Missing<br />
                  <span className="italic">token</span>.
                </h1>
                <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
                  The link you opened doesn't include a reset token. Request a
                  fresh one and we'll send a new email.
                </p>
                <Link
                  to="/forgot-password"
                  className="mt-8 inline-block border-2 border-ink bg-brand-600 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink"
                >
                  Request a new link →
                </Link>
              </>
            ) : done ? (
              <>
                <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
                  Password<br />
                  <span className="italic">updated</span>.
                </h1>
                <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
                  Sending you to the sign-in form…
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
                  Set a new<br />
                  <span className="italic">password</span>.
                </h1>
                <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
                  Pick something at least 8 characters long. You'll be signed
                  out everywhere else after the change.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
                  {serverError && <Banner kind="error">{serverError}</Banner>}

                  <FormLine
                    label="New password"
                    error={errors.password?.message}
                    inputProps={{
                      type: "password",
                      autoComplete: "new-password",
                      placeholder: "••••••••••",
                      ...register("password"),
                    }}
                  />

                  <FormLine
                    label="Confirm new password"
                    error={errors.confirm?.message}
                    inputProps={{
                      type: "password",
                      autoComplete: "new-password",
                      placeholder: "••••••••••",
                      ...register("confirm"),
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="stamp-btn mt-4 w-full border-2 border-ink bg-brand-600 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving…" : "Save new password →"}
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
