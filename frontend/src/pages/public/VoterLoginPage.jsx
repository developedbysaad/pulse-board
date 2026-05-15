import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { publicApi } from "../../api/public";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Field, Input, Banner, LiveDot } from "../../components/ui";

const schema = z.object({
  voterId: z.string().min(1, "Voter ID is required"),
  password: z.string().min(1, "Password is required"),
});

export default function VoterLoginPage() {
  const { customUrl } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      const user = await publicApi.voterLogin(customUrl, data.voterId, data.password);
      setUser(user);
      navigate(`/e/${customUrl}/vote`, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-20 animate-rise">
      <div className="mb-8 flex items-center justify-center gap-2">
        <LiveDot />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Identify yourself to vote
        </span>
      </div>
      <Card>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          Voter sign-in
        </p>
        <h1 className="mt-1 mb-6 font-display text-3xl tracking-tight text-ink">
          Use the credentials you were issued.
        </h1>
        {serverError && <Banner kind="error">{serverError}</Banner>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Voter ID" error={errors.voterId?.message}>
            <Input autoComplete="username" {...register("voterId")} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>
          <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? "Signing in…" : "Continue →"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
