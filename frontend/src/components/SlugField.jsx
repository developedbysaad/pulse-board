import { useEffect, useRef, useState } from "react";
import { electionsApi } from "../api/elections";
import { localSlugError, slugify } from "../lib/slugify";
import { Input } from "./ui";

/**
 * Slug input with live availability check.
 *
 * Two modes, picked via prop:
 *   - mode="auto"   — slug is derived from `derivedFrom` (the poll title)
 *                     and shown read-only. The check still fires so the
 *                     parent learns whether to disable submit.
 *   - mode="manual" — user types the slug directly; we slugify on the
 *                     fly, suggest collisions ("team-lunch-2"), and
 *                     return a clear status to the parent via onChange.
 *
 * The parent owns the slug state. This component is purely a controlled
 * input + an availability badge + a "use suggestion" affordance.
 *
 * Status returned via onStatusChange:
 *   { state: "idle"|"checking"|"available"|"unavailable"|"invalid",
 *     slug,                // the canonical lowercased slug
 *     reason?,             // "taken" | "reserved" | "not-canonical" | client message
 *     suggestion? }        // server-suggested fallback
 */
export function SlugField({
  value,
  onChange,
  derivedFrom,
  excludeId,
  mode = "manual",
  disabled = false,
  onStatusChange,
}) {
  const isAuto = mode === "auto";
  const [status, setStatus] = useState({ state: "idle", slug: value });
  const lastCheckedRef = useRef(null);
  const debounceRef = useRef(null);

  // In auto mode, mirror the derived slug into `value` so the parent
  // doesn't have to slugify the title itself.
  useEffect(() => {
    if (!isAuto) return;
    const next = slugify(derivedFrom || "");
    if (next !== value) onChange(next);
  }, [derivedFrom, isAuto, value, onChange]);

  // Debounced availability check whenever the slug changes.
  useEffect(() => {
    if (!value) {
      const next = { state: "invalid", slug: value, reason: "Slug can't be empty." };
      setStatus(next);
      onStatusChange?.(next);
      return;
    }

    const localErr = localSlugError(value);
    if (localErr) {
      const next = { state: "invalid", slug: value, reason: localErr };
      setStatus(next);
      onStatusChange?.(next);
      return;
    }

    if (lastCheckedRef.current === value) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus((s) => ({ ...s, state: "checking", slug: value }));
    onStatusChange?.({ state: "checking", slug: value });

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await electionsApi.slugAvailable(value, excludeId);
        lastCheckedRef.current = value;
        const next = res.available
          ? { state: "available", slug: value }
          : {
              state: "unavailable",
              slug: value,
              reason: res.reason,
              suggestion: res.suggestion,
            };
        setStatus(next);
        onStatusChange?.(next);
      } catch (err) {
        const msg =
          err?.response?.data?.error || "Couldn't check availability.";
        const next = { state: "invalid", slug: value, reason: msg };
        setStatus(next);
        onStatusChange?.(next);
      }
    }, 280);

    return () => clearTimeout(debounceRef.current);
  }, [value, excludeId, onStatusChange]);

  const useSuggestion = () => {
    if (status.suggestion) onChange(status.suggestion);
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <span className="flex shrink-0 items-center border border-r-0 border-ink/20 bg-paper-dim px-3 font-mono text-sm text-ink-muted">
          /e/
        </span>
        <Input
          value={value}
          maxLength={64}
          disabled={disabled || isAuto}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          aria-invalid={
            status.state === "unavailable" || status.state === "invalid"
              ? "true"
              : "false"
          }
          aria-describedby="slug-status"
          className="!border-l-0"
        />
      </div>

      <div
        id="slug-status"
        role="status"
        aria-live="polite"
        className="mt-2 min-h-[1.5rem] font-sans text-sm"
      >
        {status.state === "checking" && (
          <span className="text-ink-muted">Checking availability…</span>
        )}
        {status.state === "available" && (
          <span className="text-emerald-soft">
            ✓ Available — voters will reach this poll at{" "}
            <code className="font-mono text-ink">/e/{status.slug}</code>
          </span>
        )}
        {status.state === "unavailable" && (
          <span className="text-rose-soft">
            {status.reason === "reserved"
              ? "That slug is reserved — pick a different one."
              : status.reason === "not-canonical"
                ? "Slugs must be lowercase letters, numbers, and dashes only."
                : `Slug is taken.`}{" "}
            {status.suggestion && (
              <>
                Try{" "}
                <button
                  type="button"
                  onClick={useSuggestion}
                  className="font-mono text-ink underline decoration-brand-500 decoration-2 underline-offset-4 hover:text-brand-600"
                >
                  {status.suggestion}
                </button>
                ?
              </>
            )}
          </span>
        )}
        {status.state === "invalid" && (
          <span className="text-rose-soft">{status.reason}</span>
        )}
      </div>
    </div>
  );
}
