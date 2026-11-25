/**
 * Charts for the admin dashboard.
 *
 * Inline SVG, no charting dependency, no client JavaScript. Every chart is
 * paired with a table of the same numbers, so nothing is only available to
 * someone who can see it.
 *
 * Colours are the two chart tokens, which were chosen by measuring rather
 * than by eye: both sit in the lightness band for a dark surface, clear the
 * chroma floor, and separate by 28.1 under simulated colour blindness where
 * the floor is 8. See docs/VSHARES_DESIGN_SYSTEM.md.
 */

export type Point = { label: string; value: number | null; suppressed?: boolean };

function niceTicks(max: number): number[] {
  if (max <= 0) {
    return [0, 1];
  }

  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(Math.round(value * 100) / 100);
  }

  return ticks;
}

function format(value: number): string {
  return value >= 10_000 ? `${Math.round(value / 1000)}K` : value.toLocaleString("en-GB");
}

/**
 * A column per day, one series.
 *
 * One series, so no legend: the heading says what is plotted. Only the
 * largest column is labelled — a number on every column goes unread.
 */
export function ColumnChart({
  points,
  caption,
  height = 180,
}: {
  points: Point[];
  caption: string;
  height?: number;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-silver-dim">No days have been computed yet.</p>;
  }

  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(...values, 1);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] ?? 1;

  const padLeft = 38;
  const padBottom = 22;
  const padTop = 14;
  const width = Math.max(320, points.length * 26);
  const plotWidth = width - padLeft - 6;
  const plotHeight = height - padTop - padBottom;

  const band = plotWidth / points.length;
  const barWidth = Math.min(24, Math.max(3, band - 2));
  const peak = values.indexOf(Math.max(...values));

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          className="max-w-full"
        >
          {ticks.map((tick) => {
            const y = padTop + plotHeight - (tick / top) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  x2={width - 6}
                  y1={y}
                  y2={y}
                  stroke="var(--color-chart-grid)"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-silver-dim text-[10px]"
                >
                  {format(tick)}
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const value = point.value ?? 0;
            const barHeight = top === 0 ? 0 : (value / top) * plotHeight;
            const x = padLeft + index * band + (band - barWidth) / 2;
            const y = padTop + plotHeight - barHeight;

            return (
              <g key={point.label}>
                {barHeight > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={Math.min(4, barWidth / 2)}
                    fill="var(--color-chart-1)"
                  >
                    <title>{`${point.label}: ${format(value)}`}</title>
                  </rect>
                ) : null}
                {index === peak && value > 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="fill-text text-[10px] font-semibold"
                  >
                    {format(value)}
                  </text>
                ) : null}
              </g>
            );
          })}

          <line
            x1={padLeft}
            x2={width - 6}
            y1={padTop + plotHeight}
            y2={padTop + plotHeight}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {points.map((point, index) =>
            index === 0 || index === points.length - 1 ? (
              <text
                key={`${point.label}-tick`}
                x={padLeft + index * band + band / 2}
                y={height - 6}
                textAnchor={index === 0 ? "start" : "end"}
                className="fill-silver-dim text-[10px]"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-silver-dim">{caption}</figcaption>
    </figure>
  );
}

/**
 * Ranked horizontal bars, one hue, largest first.
 *
 * A withheld row keeps its place and says it was withheld, rather than
 * vanishing and making the chart look complete.
 */
export function RankedBars({ points, caption }: { points: Point[]; caption: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-silver-dim">Nothing to show for this period.</p>;
  }

  const max = Math.max(...points.map((p) => p.value ?? 0), 1);

  return (
    <figure className="m-0">
      <ul className="space-y-2">
        {points.map((point) => {
          const value = point.value;
          const width = value === null ? 0 : Math.max(2, (value / max) * 100);

          return (
            <li key={point.label} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-3">
              <span className="truncate text-sm text-silver" title={point.label}>
                {point.label}
              </span>
              <span className="h-3 rounded-full bg-raised" aria-hidden="true">
                {value === null ? null : (
                  <span
                    className="block h-3 rounded-full"
                    style={{ width: `${width}%`, backgroundColor: "var(--color-chart-1)" }}
                  />
                )}
              </span>
              <span className="text-right text-sm tabular-nums text-text">
                {value === null ? (
                  <span className="text-xs text-silver-dim">withheld</span>
                ) : (
                  format(value)
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-3 text-xs text-silver-dim">{caption}</figcaption>
    </figure>
  );
}

/**
 * A headline number with its definition and its limit.
 *
 * The limit is not optional and not hidden behind a tooltip: a number whose
 * meaning has to be guessed at is worse than no number.
 */
export function StatTile({
  label,
  value,
  unit,
  definition,
  limit,
  emptyLabel = "Not enough data",
}: {
  label: string;
  value: string | null;
  unit?: string;
  definition: string;
  limit: string;
  /**
   * What to say when there is no value. "Not enough data" means more data
   * would fill it; "Not measured" means nothing collects it and nothing
   * will. Showing the first where the second is true invites the reader to
   * wait for a number that is never coming.
   */
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-silver-dim">{label}</p>
      <p className="mt-2 font-display text-3xl text-white tabular-nums">
        {value ?? <span className="text-xl text-silver-dim">{emptyLabel}</span>}
        {value !== null && unit ? (
          <span className="ml-1 text-base text-silver">{unit}</span>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-silver">{definition}</p>
      <p className="mt-1 text-xs text-silver-dim">{limit}</p>
    </div>
  );
}

/** The same numbers as a table, so the charts are never the only way in. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="pb-2 text-left text-xs text-silver-dim">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`border-b border-border py-2 text-xs font-semibold uppercase tracking-wide text-silver-dim ${
                  index === 0 ? "text-left" : "text-right"
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, index) => (
                <td
                  key={columns[index] ?? index}
                  className={`border-b border-border py-2 tabular-nums ${
                    index === 0 ? "text-left text-silver" : "text-right text-text"
                  }`}
                >
                  {cell === null ? <span className="text-silver-dim">—</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
