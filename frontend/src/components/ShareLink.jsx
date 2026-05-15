import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Public-link sharing widget.
 *
 * Two views toggleable inline:
 *   "link" — the URL chip + copy/share text actions (default).
 *   "qr"   — a composed canvas (QR + URL caption at the bottom) plus a
 *            download affordance. The same Copy/Share buttons retarget to
 *            the image: clipboard write of image/png, or Web Share with a
 *            File when the platform supports it.
 *
 * Sizes:
 *   "default" — full row used on the ElectionEditor header.
 *   "compact" — slimmer variant used inside DashboardPage cards.
 */

// Approximate hex of the design tokens — canvas can't read CSS vars set in
// oklch, and the exported image needs to look the same on any background.
const PAPER_HEX = "#f6efe1";
const INK_HEX = "#231e15";

const QR_PX = 240;
const PAD = 24;
const GAP = 18;
const FONT_PX = 13;
const LINE_PX = 18;
const FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function wrapMonoUrl(ctx, text, maxWidth) {
  // URLs don't have spaces, so we break by characters.
  const lines = [];
  let current = "";
  for (const ch of text) {
    const candidate = current + ch;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderQrComposite(canvas, url) {
  const ctx = canvas.getContext("2d");
  // Wait for the mono font so measureText matches what gets drawn.
  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* noop */
    }
  }

  ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
  const lines = wrapMonoUrl(ctx, url, QR_PX);
  const textBlock = lines.length * LINE_PX;

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const cssW = QR_PX + PAD * 2;
  const cssH = PAD + QR_PX + GAP + textBlock + PAD;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Paper background + thin ink frame.
  ctx.fillStyle = PAPER_HEX;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = INK_HEX;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, cssW - 1.5, cssH - 1.5);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    width: QR_PX,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: INK_HEX, light: PAPER_HEX },
  });
  ctx.drawImage(qrCanvas, PAD, PAD, QR_PX, QR_PX);

  ctx.fillStyle = INK_HEX;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, cssW / 2, PAD + QR_PX + GAP + i * LINE_PX);
  });
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
}

export function ShareLink({
  path,
  title = "Pulse Board poll",
  size = "default",
  className = "",
}) {
  // copied: null | "link" | "qr" — discriminated so each button flashes
  // its own "Copied ✓" without confusion when both are visible at once.
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const canvasRef = useRef(null);

  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const filename = `pulse-${(path.split("/").filter(Boolean).pop() || "qr").replace(/[^a-z0-9-_]/gi, "-")}.png`;

  useEffect(() => {
    if (!qrOpen || !canvasRef.current) return;
    let alive = true;
    setError(null);
    renderQrComposite(canvasRef.current, fullUrl).catch(() => {
      if (alive) setError("Couldn't render QR code");
    });
    return () => {
      alive = false;
    };
  }, [qrOpen, fullUrl]);

  const flash = useCallback((which) => {
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800);
  }, []);

  const copyLink = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(fullUrl);
      flash("link");
    } catch {
      setError("Press ⌘C / Ctrl-C to copy");
    }
  };

  const copyQr = async () => {
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("clipboard images unsupported");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      flash("qr");
    } catch {
      // Fall back to a file download — at least the user keeps the artifact.
      downloadBlob(blob, filename);
      flash("qr");
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (blob) downloadBlob(blob, filename);
  };

  const shareLink = async () => {
    setError(null);
    if (!canShare) {
      copyLink();
      return;
    }
    try {
      await navigator.share({ url: fullUrl, title });
    } catch (err) {
      if (err?.name !== "AbortError") copyLink();
    }
  };

  const isCompact = size === "compact";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`flex items-stretch ${isCompact ? "gap-1" : "gap-2"}`}>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          title={`Open ${fullUrl} in a new tab`}
          className={`min-w-0 flex-1 truncate border border-ink/20 bg-paper-dim font-mono text-ink underline-offset-4 hover:border-ink hover:text-brand-600 hover:underline ${
            isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
          }`}
        >
          {path}
        </a>

        <button
          type="button"
          onClick={() => setQrOpen((v) => !v)}
          aria-pressed={qrOpen}
          aria-label={qrOpen ? "Hide QR code" : "Show QR code"}
          title={qrOpen ? "Hide QR code" : "Show QR code"}
          className={`shrink-0 border border-ink font-mono uppercase tracking-[0.18em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            qrOpen
              ? "bg-ink text-paper"
              : "bg-paper text-ink hover:bg-ink hover:text-paper"
          } ${isCompact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2.5 text-[11px]"}`}
        >
          QR
        </button>

        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy public link"
          className={`shrink-0 border border-ink bg-paper font-mono uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            isCompact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2.5 text-[11px]"
          }`}
        >
          {copied === "link" ? "Copied ✓" : "Copy link"}
        </button>

        {canShare && (
          <button
            type="button"
            onClick={shareLink}
            aria-label="Share public link"
            className={`shrink-0 border-2 border-ink bg-ink font-mono uppercase tracking-[0.18em] text-paper transition-colors hover:bg-brand-600 hover:border-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              isCompact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2.5 text-[11px]"
            }`}
          >
            Share →
          </button>
        )}

        {/* Live region announces copy success without visual clutter on desktop */}
        <span className="sr-only" aria-live="polite">
          {copied === "link" ? "Public link copied to clipboard" : ""}
          {copied === "qr" ? "QR image copied to clipboard" : ""}
          {error || ""}
        </span>
      </div>

      {qrOpen && (
        <div
          className="flex animate-rise flex-col items-center gap-3 self-start border border-ink/20 bg-paper p-3"
          style={{ animationDelay: "0s" }}
        >
          <canvas
            ref={canvasRef}
            width={QR_PX + PAD * 2}
            height={QR_PX + PAD * 2 + GAP + LINE_PX + PAD}
            className="block max-w-full"
            aria-label={`QR code for ${fullUrl}. Link printed beneath the code.`}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyQr}
              aria-label="Copy QR code image to clipboard"
              className="shrink-0 border border-ink bg-paper px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {copied === "qr" ? "Copied ✓" : "Copy QR code"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              ↓ Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
