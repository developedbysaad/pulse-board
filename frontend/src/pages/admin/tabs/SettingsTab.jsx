import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { electionsApi } from "../../../api/elections";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Banner,
} from "../../../components/ui";
import { SlugField } from "../../../components/SlugField";

function toLocalInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function SettingsTab({ election }) {
  const qc = useQueryClient();
  const [name, setName] = useState(election.name);
  const [customUrl, setCustomUrl] = useState(election.customUrl || "");
  const [slugStatus, setSlugStatus] = useState({ state: "idle" });
  const [mode, setMode] = useState(election.mode);
  const [expiresAt, setExpiresAt] = useState(toLocalInput(election.expiresAt));
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const updateMut = useMutation({
    mutationFn: (data) => electionsApi.update(election.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["election", election.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => setError(e.response?.data?.error || e.message),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    const body = {};
    if (!election.launched) {
      if (name !== election.name) body.name = name;
      if (customUrl !== (election.customUrl || "")) body.customUrl = customUrl;
      if (mode !== election.mode) body.mode = mode;
    }
    const newExp = expiresAt ? new Date(expiresAt).toISOString() : null;
    if (newExp !== (election.expiresAt || null)) body.expiresAt = newExp;
    if (Object.keys(body).length === 0) return;
    updateMut.mutate(body);
  };

  return (
    <Card>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        Configure
      </p>
      <h2 className="mb-6 font-display text-2xl tracking-tight text-ink">
        Poll <em className="italic">settings</em>
      </h2>

      {error && <Banner kind="error">{error}</Banner>}
      {saved && <Banner kind="success">Saved.</Banner>}
      {election.launched && (
        <Banner kind="warn">
          Once launched, only the expiry can be changed.
        </Banner>
      )}

      <form onSubmit={submit}>
        <Field label="Poll name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={election.launched}
          />
        </Field>
        <Field label="Public link slug">
          <SlugField
            value={customUrl}
            onChange={setCustomUrl}
            disabled={election.launched}
            excludeId={election.id}
            mode="manual"
            onStatusChange={setSlugStatus}
          />
        </Field>
        <Field label="Response mode">
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={election.launched}
          >
            <option value="authenticated">
              Authenticated · pre-registered voters
            </option>
            <option value="anonymous">Anonymous · open link</option>
          </Select>
        </Field>
        <Field label="Expires at" hint="Optional. Leave blank for no expiry.">
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              updateMut.isPending ||
              slugStatus.state === "checking" ||
              slugStatus.state === "unavailable" ||
              slugStatus.state === "invalid"
            }
          >
            {updateMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
