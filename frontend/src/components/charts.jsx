import { useState } from "react";

/**
 * Charts drawn as inline SVG and plain HTML rather than with a charting
 * library. A till already carries a 125 KB scanner it may never use;
 * adding another 100 KB to draw fifteen rectangles would be a poor
 * trade, and these need no runtime a service worker has to cache.
 *
 * Rules the marks follow, and the reasons:
 *   - one hue for magnitude, because a bar chart of one measure is not
 *     four categories and should not look like it
 *   - 4px rounded ends anchored to the baseline, so a bar reads as a
 *     bar and not a floating capsule
 *   - a 2px gap between neighbours, so adjacent bars stay countable
 *   - recessive grid, no axis furniture that repeats the labels
 *   - every value is reachable as text, by hover and by the figures
 *     printed beside the ranked lists
 */

const BAR_HUE = "var(--color-accent-solid)";

/** Vertical bars, for a measure across time. */
export function BarChart({ data, format, height = 168, emptyLabel = "Nothing yet" }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 0);

  if (!data.length || max <= 0) {
    return (
      <div className="flex h-42 items-center justify-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  const point = hover === null ? null : data[hover];

  return (
    <div className="relative">
      {point ? (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded bg-ink px-2.5 py-1.5 text-xs text-white shadow-raised">
          <span className="tnum font-semibold">{format(point.value)}</span>
          <span className="ml-2 opacity-70">{point.key}</span>
        </div>
      ) : null}

      <div
        className="flex items-end gap-[2px]"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {data.map((d, i) => {
          const ratio = d.value / max;
          return (
            <button
              key={d.key}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              title={`${d.key}: ${format(d.value)}`}
              className="group relative flex h-full flex-1 flex-col justify-end rounded-t"
            >
              {/* A full-height hit area, so a 3px bar is still hoverable. */}
              <span
                className="w-full rounded-t transition-opacity"
                style={{
                  height: `${Math.max(ratio * 100, d.value > 0 ? 2 : 0)}%`,
                  background: BAR_HUE,
                  opacity: hover === null || hover === i ? 1 : 0.35,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-[2px]">
        {data.map((d) => (
          <span
            key={d.key}
            className="tnum flex-1 truncate text-center text-[10px] text-muted"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bars. One hue, because every row measures the same
 * thing and a row of different colours would imply otherwise. Identity
 * is the label beside each bar, which is where it belongs.
 */
export function RankedBars({ rows, format, emptyLabel = "Nothing yet" }) {
  const max = Math.max(...rows.map((r) => r.value), 0);

  if (!rows.length || max <= 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink">{row.name}</span>
            <span className="tnum shrink-0 text-sm font-medium text-ink">
              {format(row.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((row.value / max) * 100, 2)}%`,
                background: BAR_HUE,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A number that needs no plot. */
export function StatTile({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "text-ink",
    good: "text-good",
    bad: "text-bad",
    accent: "text-accent",
  };
  return (
    <div className="rounded-md border border-line bg-surface px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className={`tnum mt-1.5 text-3xl font-semibold ${tones[tone]}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({ title, hint, children, className = "" }) {
  return (
    <section
      className={`rounded-md border border-line bg-surface p-5 ${className}`}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
