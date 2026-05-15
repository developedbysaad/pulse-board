import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "../../context/AuthContext";
import { Banner, LiveDot, Stamp, TallyMark } from "../../components/ui";
import { readSigninCount, bumpSigninCount } from "../../lib/signinTally";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const [signinCount] = useState(() => readSigninCount());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      bumpSigninCount();
      const target = location.state?.from?.pathname || "/home";
      navigate(target, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.error || "Login failed");
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
        <div className="flex items-center gap-3">
          <span className="hidden font-sans text-sm text-ink-muted sm:inline">
            New here?
          </span>
          <Link
            to="/signup"
            className="border-2 border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-paper transition-colors hover:bg-brand-600 hover:border-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Create account →
          </Link>
        </div>
      </nav>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div
          className="paper-grain relative w-full max-w-md animate-rise border border-ink bg-paper p-10"
          style={{ boxShadow: "8px 8px 0 0 var(--color-ink)" }}
        >
          <span className="absolute -right-4 -top-4 z-10">
            <Stamp tone="coral">Sign-in slip</Stamp>
          </span>

          <div className="relative z-10">
            <div className="mb-6 flex items-baseline justify-between border-b border-ink/30 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Form A · Returning member
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                {today}
              </span>
            </div>

            <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink">
              Sign the<br />
              <span className="italic">register</span>.
            </h1>
            <p className="mt-3 max-w-sm font-sans text-sm text-ink-soft">
              Enter your details on the line below — same email and password
              you used to set up the account.
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

              <FormLine
                label="Password"
                error={errors.password?.message}
                inputProps={{
                  type: "password",
                  autoComplete: "current-password",
                  placeholder: "••••••••••",
                  ...register("password"),
                }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="stamp-btn mt-8 w-full border-2 border-ink bg-brand-600 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
              >
                {isSubmitting ? "Signing in…" : "Sign in →"}
              </button>
            </form>

            {signinCount > 0 ? (
              <div className="mt-8 flex items-center justify-between border-t border-ink/15 pt-4">
                <span className="flex items-center gap-2 text-brand-600">
                  <TallyMark count={signinCount} />
                </span>
                <span className="font-sans text-sm text-ink-muted">
                  signed in {signinCount}{" "}
                  {signinCount === 1 ? "time" : "times"} from this browser
                </span>
              </div>
            ) : (
              <div className="mt-8 border-t border-ink/15 pt-4">
                <span className="font-sans text-sm text-ink-muted">
                  First time on this browser? Welcome.
                </span>
              </div>
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
