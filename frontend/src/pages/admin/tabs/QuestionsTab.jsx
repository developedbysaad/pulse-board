import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { electionsApi } from "../../../api/elections";
import { Button, Card, Field, Input, Banner } from "../../../components/ui";

const questionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  isRequired: z.boolean(),
});
const optionSchema = z.string().trim().min(1, "Label can't be blank").max(200);

const MIN_OPTIONS = 2;

export default function QuestionsTab({ election }) {
  const qc = useQueryClient();
  const electionId = election.id;
  const questions = election.Questions || [];
  const locked = election.launched;

  // After a successful question add, focus that question's option input.
  const [focusQuestionId, setFocusQuestionId] = useState(null);
  const previousIdsRef = useRef(new Set(questions.map((q) => q.id)));

  useEffect(() => {
    const previousIds = previousIdsRef.current;
    const newIds = questions
      .map((q) => q.id)
      .filter((id) => !previousIds.has(id));
    if (newIds.length > 0) {
      setFocusQuestionId(newIds[newIds.length - 1]);
    }
    previousIdsRef.current = new Set(questions.map((q) => q.id));
  }, [questions]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["election", electionId] });

  const addQ = useMutation({
    mutationFn: (data) => electionsApi.questions.create(electionId, data),
    onSuccess: invalidate,
  });
  const updQ = useMutation({
    mutationFn: ({ qid, data }) => electionsApi.questions.update(electionId, qid, data),
    onSuccess: invalidate,
  });
  const delQ = useMutation({
    mutationFn: (qid) => electionsApi.questions.remove(electionId, qid),
    onSuccess: invalidate,
  });
  const addO = useMutation({
    mutationFn: ({ qid, label }) =>
      electionsApi.options.create(electionId, qid, { label }),
    onSuccess: invalidate,
  });
  const delO = useMutation({
    mutationFn: ({ qid, oid }) => electionsApi.options.remove(electionId, qid, oid),
    onSuccess: invalidate,
  });

  const {
    register: registerQ,
    handleSubmit: handleQSubmit,
    reset: resetQ,
    formState: { errors: qErrors },
  } = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: { title: "", description: "", isRequired: true },
  });

  const submitQ = handleQSubmit(({ title, description, isRequired }) => {
    addQ.mutate(
      {
        title,
        description: description ? description : null,
        isRequired,
      },
      { onSuccess: () => resetQ({ title: "", description: "", isRequired: true }) }
    );
  });

  // Health check — questions with too few options are why polls go live broken.
  const incomplete = questions.filter(
    (q) => (q.Options || []).length < MIN_OPTIONS
  );

  return (
    <div>
      {locked && (
        <Banner kind="warn">
          This poll is launched — questions and options are locked.
        </Banner>
      )}

      {!locked && questions.length > 0 && incomplete.length > 0 && (
        <Banner kind="warn">
          {incomplete.length === 1
            ? "1 question doesn't have enough options yet"
            : `${incomplete.length} questions don't have enough options yet`}{" "}
          — voters need at least {MIN_OPTIONS} per question. Look for the
          warning rule below.
        </Banner>
      )}

      {!locked && (
        <Card className="mb-6">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Compose · Step 1 of 2
          </p>
          <h2 className="mb-1 font-display text-2xl tracking-tight text-ink">
            Add a question
          </h2>
          <p className="mb-5 font-sans text-sm text-ink-soft">
            Write the question first. Add the answer options to it on the
            next step (you'll see an "Add option…" line at the bottom of the
            question card).
          </p>
          <form onSubmit={submitQ} noValidate>
            <Field label="Question title" error={qErrors.title?.message}>
              <Input
                maxLength={500}
                placeholder="What feature should we ship next?"
                {...registerQ("title")}
              />
            </Field>
            <Field
              label="Description"
              hint="Optional context shown beneath the title."
              error={qErrors.description?.message}
            >
              <Input
                maxLength={5000}
                placeholder="Pick the one you'd use first."
                {...registerQ("description")}
              />
            </Field>
            <label className="mb-5 inline-flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                {...registerQ("isRequired")}
                className="h-4 w-4 accent-brand-600"
              />
              Required (voter must answer)
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={addQ.isPending}>
                {addQ.isPending ? "Adding…" : "Add question →"}
              </Button>
            </div>
            {addQ.error && (
              <Banner kind="error">
                {addQ.error.response?.data?.error || addQ.error.message}
              </Banner>
            )}
          </form>
        </Card>
      )}

      {questions.length === 0 && !locked && (
        <Card className="py-12 text-center">
          <p className="font-display text-2xl italic text-ink-soft">
            No questions yet — compose one above.
          </p>
        </Card>
      )}

      {questions.map((q, idx) => {
        const opts = q.Options || [];
        const incomplete = opts.length < MIN_OPTIONS;
        return (
          <Card
            key={q.id}
            className={`mb-4 ${
              incomplete ? "border-amber-soft/60" : ""
            }`}
          >
            <QuestionEditor
              q={q}
              idx={idx}
              locked={locked}
              autoFocusOption={focusQuestionId === q.id}
              onUpdate={(data) => updQ.mutate({ qid: q.id, data })}
              onDelete={() => {
                if (confirm(`Delete question "${q.title}"?`)) delQ.mutate(q.id);
              }}
              onAddOption={(label) => addO.mutate({ qid: q.id, label })}
              onRemoveOption={(oid) => delO.mutate({ qid: q.id, oid })}
            />
          </Card>
        );
      })}
    </div>
  );
}

function QuestionEditor({
  q,
  idx,
  locked,
  autoFocusOption,
  onUpdate,
  onDelete,
  onAddOption,
  onRemoveOption,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(q.title);
  const [desc, setDesc] = useState(q.description || "");
  const [req, setReq] = useState(q.isRequired);
  const [optLabel, setOptLabel] = useState("");
  const [optError, setOptError] = useState(null);

  const cardRef = useRef(null);
  const optInputRef = useRef(null);

  // After a freshly-added question lands, scroll its card into view and
  // focus the option input so the admin can immediately type the first option.
  useEffect(() => {
    if (autoFocusOption && cardRef.current && optInputRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Slight delay so the smooth scroll doesn't fight the focus.
      const id = setTimeout(() => optInputRef.current?.focus(), 280);
      return () => clearTimeout(id);
    }
  }, [autoFocusOption]);

  const opts = q.Options || [];
  const incomplete = opts.length < MIN_OPTIONS;
  const existingLabels = new Set(
    opts.map((o) => o.label.trim().toLowerCase())
  );

  const tryAddOption = () => {
    const parsed = optionSchema.safeParse(optLabel);
    if (!parsed.success) {
      setOptError(parsed.error.issues[0].message);
      return;
    }
    if (existingLabels.has(parsed.data.toLowerCase())) {
      setOptError("That option already exists.");
      return;
    }
    setOptError(null);
    onAddOption(parsed.data);
    setOptLabel("");
    // Keep focus so the admin can type the next option immediately.
    requestAnimationFrame(() => optInputRef.current?.focus());
  };

  return (
    <div ref={cardRef}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          {!editing ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Q{String(idx + 1).padStart(2, "0")}
                {q.isRequired && (
                  <span className="ml-2 text-brand-600">· required</span>
                )}
              </p>
              <h3 className="mt-1 font-display text-2xl leading-tight tracking-tight text-ink">
                {q.title}
              </h3>
              {q.description && (
                <p className="mt-2 font-sans text-sm text-ink-soft">
                  {q.description}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
              />
              <label className="inline-flex items-center gap-2 font-sans text-sm text-ink">
                <input
                  type="checkbox"
                  checked={req}
                  onChange={(e) => setReq(e.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                Required
              </label>
            </div>
          )}
        </div>
        {!locked && (
          <div className="flex shrink-0 gap-2">
            {!editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={onDelete}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdate({ title, description: desc || null, isRequired: req });
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {opts.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {opts.map((o, i) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 border border-ink/15 bg-paper-dim px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-sans text-sm text-ink">{o.label}</span>
              </div>
              {!locked && (
                <button
                  type="button"
                  onClick={() => onRemoveOption(o.id)}
                  className="font-mono text-xs text-ink-muted hover:text-rose-soft"
                  aria-label={`Remove ${o.label}`}
                >
                  ✕ Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : !locked ? (
        <p className="mb-3 font-sans text-sm text-ink-muted">
          No answer options yet. Type one below and press Enter to add.
        </p>
      ) : null}

      {!locked && incomplete && (
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-soft">
          ⚠ Needs at least {MIN_OPTIONS - opts.length} more option
          {MIN_OPTIONS - opts.length === 1 ? "" : "s"} before launch
        </p>
      )}

      {!locked && (
        <>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
            Add an answer option
          </label>
          <div className="flex gap-2">
            <Input
              ref={optInputRef}
              value={optLabel}
              maxLength={200}
              onChange={(e) => {
                setOptLabel(e.target.value);
                if (optError) setOptError(null);
              }}
              placeholder="e.g. Mobile companion app"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tryAddOption();
                }
              }}
              aria-invalid={optError ? "true" : "false"}
              className="text-base"
            />
            <Button
              size="md"
              disabled={!optLabel.trim()}
              onClick={tryAddOption}
            >
              Add option
            </Button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Tip · press Enter to add and keep typing the next one
          </p>
          {optError && (
            <p className="mt-2 font-sans text-sm font-medium text-rose-soft">
              {optError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
