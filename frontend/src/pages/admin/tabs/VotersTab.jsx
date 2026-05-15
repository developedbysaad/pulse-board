import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { electionsApi } from "../../../api/elections";
import { Button, Card, Field, Input, Banner, Tag } from "../../../components/ui";

const voterSchema = z.object({
  voterId: z
    .string()
    .trim()
    .min(1, "Voter ID is required")
    .max(100, "Voter ID is too long")
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dot, underscore or dash"),
  password: z
    .string()
    .min(4, "At least 4 characters")
    .max(200, "Too long"),
});

export default function VotersTab({ election }) {
  const qc = useQueryClient();
  const electionId = election.id;
  const voters = election.Voters || [];
  const locked = election.launched;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["election", electionId] });

  const addV = useMutation({
    mutationFn: (data) => electionsApi.voters.create(electionId, data),
    onSuccess: invalidate,
  });
  const delV = useMutation({
    mutationFn: (vid) => electionsApi.voters.remove(electionId, vid),
    onSuccess: invalidate,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(voterSchema),
    defaultValues: { voterId: "", password: "" },
  });

  const submit = handleSubmit((data) => {
    addV.mutate(data, {
      onSuccess: () => reset({ voterId: "", password: "" }),
    });
  });

  return (
    <div>
      {locked && (
        <Banner kind="warn">Voters are locked once the poll is launched.</Banner>
      )}

      {!locked && (
        <Card className="mb-6">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Roster
          </p>
          <h2 className="mb-5 font-display text-2xl tracking-tight text-ink">
            Add a voter
          </h2>
          <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
            <Field label="Voter ID" error={errors.voterId?.message}>
              <Input
                maxLength={100}
                placeholder="alice"
                autoComplete="off"
                {...register("voterId")}
              />
            </Field>
            <Field
              label="Initial password"
              hint="At least 4 characters."
              error={errors.password?.message}
            >
              <Input
                type="text"
                maxLength={200}
                autoComplete="off"
                placeholder="••••••"
                {...register("password")}
              />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={addV.isPending || isSubmitting}>
                {addV.isPending ? "Adding…" : "Add voter →"}
              </Button>
            </div>
            {addV.error && (
              <div className="md:col-span-2">
                <Banner kind="error">
                  {addV.error.response?.data?.error || addV.error.message}
                </Banner>
              </div>
            )}
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-tight text-ink">
            <em className="italic">All</em> voters
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            {voters.length} total
          </span>
        </div>
        {voters.length === 0 && (
          <p className="font-sans text-sm text-ink-muted">
            No voters added yet.
          </p>
        )}
        <ul className="divide-y divide-ink/10">
          {voters.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-ink">{v.voterId}</span>
                {v.voted && <Tag tone="published">Voted</Tag>}
              </div>
              {!locked && (
                <button
                  type="button"
                  onClick={() => delV.mutate(v.id)}
                  className="font-mono text-xs text-ink-muted hover:text-rose-soft"
                  aria-label={`Remove ${v.voterId}`}
                >
                  ✕ Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
