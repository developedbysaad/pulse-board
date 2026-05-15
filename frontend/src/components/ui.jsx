export function Button({
  as: As = "button",
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const variants = {
    primary:
      "bg-ink text-paper border border-ink hover:bg-brand-600 hover:border-brand-600",
    accent:
      "bg-brand-600 text-paper border border-brand-700 hover:bg-brand-500",
    secondary:
      "bg-paper text-ink border border-ink hover:bg-paper-deep",
    ghost:
      "bg-transparent text-ink-soft border border-transparent hover:text-ink hover:border-ink/20",
    danger:
      "bg-paper text-rose-soft border border-rose-soft hover:bg-rose-soft hover:text-paper",
    link: "bg-transparent text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink border-0 px-0",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs tracking-wide",
    md: "px-4 py-2 text-sm tracking-wide",
    lg: "px-6 py-3 text-sm tracking-wide",
  };

  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`input-paper w-full rounded-none border border-ink/20 bg-paper px-3 py-2.5 font-sans text-base text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0 disabled:bg-paper-dim disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`input-paper w-full rounded-none border border-ink/20 bg-paper px-3 py-2.5 font-sans text-base text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`input-paper w-full appearance-none rounded-none border border-ink/20 bg-paper bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%2322201d%22 stroke-width=%221.5%22><path d=%22M2 4l4 4 4-4%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-10 font-sans text-base text-ink focus:border-ink focus:outline-none focus:ring-0 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className = "", ...props }) {
  return (
    <label
      className={`mb-1.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="mb-5">
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && (
        <p className="mt-1.5 font-sans text-xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 font-sans text-xs text-rose-soft">{error}</p>
      )}
    </div>
  );
}

export function Card({ className = "", as: As = "div", ...props }) {
  return (
    <As
      className={`relative rounded-none border border-ink/15 bg-paper p-6 transition-colors hover:border-ink/35 ${className}`}
      {...props}
    />
  );
}

export function Banner({ kind = "info", children }) {
  const map = {
    info: "border-ink/20 bg-paper-dim text-ink",
    error: "border-rose-soft/40 bg-paper text-rose-soft",
    success: "border-emerald-soft/40 bg-paper text-emerald-soft",
    warn: "border-amber-soft/40 bg-paper text-amber-soft",
  };
  return (
    <div
      className={`mb-4 rounded-none border-l-4 px-4 py-3 font-sans text-sm ${map[kind]}`}
    >
      {children}
    </div>
  );
}

export function Tag({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-ink/30 text-ink",
    live: "border-brand-600 text-brand-600",
    ended: "border-ink/40 text-ink-muted",
    published: "border-indigo-deep text-indigo-deep",
    draft: "border-amber-soft text-amber-soft",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tones[tone]} ${className}`}
    >
      {tone === "live" && <LiveDot />}
      {children}
    </span>
  );
}

export function LiveDot({ className = "" }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot ${className}`}
    />
  );
}

export function Stat({ label, value, sub, align = "left" }) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  return (
    <div className={alignCls}>
      <p className="font-display text-5xl leading-none tracking-tight text-ink tabular-nums md:text-6xl">
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </p>
      {sub && (
        <p className="mt-1 font-sans text-xs text-ink-muted">{sub}</p>
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, italic, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink md:text-5xl">
          {italic ? <em className="italic">{italic}</em> : null}
          {italic && title ? " " : null}
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function Divider({ className = "" }) {
  return <hr className={`border-0 border-t border-ink/15 ${className}`} />;
}

/**
 * Hand-drawn five-bar tally. Renders ⌊count/5⌋ groups + remainder strokes.
 * Each stroke draws via stroke-dashoffset keyframe (animate-draw-tally).
 */
export function TallyMark({ count = 1, className = "", animate = true }) {
  const groups = Math.max(0, Math.floor(count / 5));
  const remainder = Math.max(0, count % 5);
  const total = groups + (remainder > 0 ? 1 : 0);
  return (
    <span
      className={`inline-flex items-end gap-2 align-middle ${className}`}
      aria-label={`tally count: ${count}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <TallyGroup
          key={i}
          strokes={i < groups ? 5 : remainder}
          delay={i * 0.18}
          animate={animate}
        />
      ))}
    </span>
  );
}

function TallyGroup({ strokes, delay, animate }) {
  const w = 28;
  const h = 22;
  const verticals = [4, 9, 14, 19];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      {verticals.slice(0, Math.min(strokes, 4)).map((x, i) => (
        <line
          key={i}
          x1={x}
          y1="2"
          x2={x}
          y2="20"
          style={
            animate
              ? {
                  strokeDasharray: 22,
                  strokeDashoffset: 22,
                  animation: `draw-tally 0.55s cubic-bezier(.4,0,.2,1) both`,
                  animationDelay: `${delay + i * 0.08}s`,
                }
              : undefined
          }
        />
      ))}
      {strokes >= 5 && (
        <line
          x1="0"
          y1="18"
          x2="24"
          y2="3"
          style={
            animate
              ? {
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                  animation: `draw-tally 0.5s cubic-bezier(.4,0,.2,1) both`,
                  animationDelay: `${delay + 0.4}s`,
                }
              : undefined
          }
        />
      )}
    </svg>
  );
}

/** Rubber-stamp word — rotated, ink-blot border, used for masthead accents. */
export function Stamp({ children, className = "", tone = "ink" }) {
  const tones = {
    ink: "text-ink border-ink",
    coral: "text-brand-600 border-brand-600",
  };
  return (
    <span
      className={`inline-block rotate-[-3deg] border-2 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] animate-stamp ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
