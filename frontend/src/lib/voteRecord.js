/**
 * Per-browser record of which polls this device has already voted in.
 *
 * Backed by localStorage keyed by election id. The server is the source
 * of truth (it tracks the same set in the express-session row + hashes
 * the IP), but a localStorage marker means the FE can short-circuit the
 * "show me the ballot again" navigation on revisit *before* the API
 * returns alreadyVoted: true. Result: snappier UX with no flicker on
 * the way to the thank-you page.
 *
 * Honest scope: this is per-browser, not per-person. A different device
 * on the same network won't see this marker — that case relies on the
 * server's session + ipHash combination.
 */

const STORAGE_KEY = "pb.votedIn";

function readSet() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((v) => Number(v)).filter(Number.isFinite));
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function hasVotedLocally(electionId) {
  if (electionId == null) return false;
  return readSet().has(Number(electionId));
}

export function markVotedLocally(electionId) {
  if (electionId == null) return;
  const set = readSet();
  set.add(Number(electionId));
  writeSet(set);
}

export function clearVoteRecord(electionId) {
  const set = readSet();
  set.delete(Number(electionId));
  writeSet(set);
}
