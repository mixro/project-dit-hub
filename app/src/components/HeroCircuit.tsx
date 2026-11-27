import type { CSSProperties } from "react";

/**
 * Decorative circuit board behind the home hero: copper traces run in from both edges and
 * signal pulses travel along them toward the search, lighting a solder pad when they arrive.
 * Pure SVG + CSS (styles.css, "hero circuit"): no script, no library, a few hundred bytes gzipped.
 * Colour comes from currentColor (= --accent), so it follows the light and dark themes.
 * prefers-reduced-motion stops every animation and leaves the static board.
 */

type Trace = { d: string; end: [number, number]; delay: number };

// Left half of the board, drawn in a 1200 × 480 box with 45° bends like a real PCB layout.
// The right half reuses these paths mirrored, with other delays, so the two sides never pulse in step.
const SIDE: Trace[] = [
  { d: "M0 70 H140 L190 120 H330", end: [330, 120], delay: 0 },
  { d: "M0 160 H90 L140 210 H250 L280 240 H370", end: [370, 240], delay: 2.6 },
  { d: "M0 300 H170 L220 250 H300", end: [300, 250], delay: 5.1 },
  { d: "M0 390 H120 L170 340 H390", end: [390, 340], delay: 1.4 },
  { d: "M0 450 H260 L300 410 H430", end: [430, 410], delay: 3.9 },
  { d: "M70 0 V40 L120 90 H230", end: [230, 90], delay: 6.2 },
];
const MIRROR_DELAYS = [3.3, 0.7, 4.6, 6.0, 1.9, 2.4];

// Two buses that cross the middle (faded behind the text by the mask); on phones these are what shows.
const CENTRE: Trace[] = [
  { d: "M440 0 V24 L470 54 H600", end: [600, 54], delay: 4.2 },
  { d: "M760 480 V452 L730 422 H600", end: [600, 422], delay: 0.9 },
  { d: "M760 0 V18 L720 58 H660", end: [660, 58], delay: 2.0 },
  { d: "M440 480 V462 L470 432 H540", end: [540, 432], delay: 5.6 },
];

const VIAS: [number, number][] = [[140, 70], [90, 160], [170, 300], [120, 390], [260, 450], [1060, 94], [1110, 184], [1030, 324]];

function TraceGroup({ t, delay }: { t: Trace; delay: number }) {
  return (
    <g style={{ "--d": `${delay}s` } as CSSProperties}>
      <path className="hc-base" d={t.d} />
      <path className="hc-pulse" d={t.d} pathLength={100} />
      <circle className="hc-glow" cx={t.end[0]} cy={t.end[1]} r={7} />
      <circle className="hc-pad" cx={t.end[0]} cy={t.end[1]} r={4.5} />
    </g>
  );
}

export function HeroCircuit() {
  return (
    <svg className="hero-circuit" viewBox="0 0 1200 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        {/* Masks work on luminance, so white here means "visible", not a colour on screen. */}
        <radialGradient id="hc-fade-c" cx="50%" cy="46%" r="62%">
          <stop className="hc-fade-0" offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop className="hc-fade-1" offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="hc-fade-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.78" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="hc-mask-c"><rect width="1200" height="480" fill="url(#hc-fade-c)" /></mask>
        <mask id="hc-mask-v"><rect width="1200" height="480" fill="url(#hc-fade-v)" /></mask>
      </defs>
      <g mask="url(#hc-mask-v)">
        <g mask="url(#hc-mask-c)">
          {SIDE.map((t, i) => <TraceGroup key={`l${i}`} t={t} delay={t.delay} />)}
          <g transform="translate(1200 24) scale(-1 1)">
            {SIDE.map((t, i) => <TraceGroup key={`r${i}`} t={t} delay={MIRROR_DELAYS[i]} />)}
          </g>
          {CENTRE.map((t, i) => <TraceGroup key={`c${i}`} t={t} delay={t.delay} />)}
          {VIAS.map(([x, y], i) => <circle key={`v${i}`} className="hc-via" cx={x} cy={y} r={2.5} />)}
          {/* Two small chips the traces seem to come from. */}
          <rect className="hc-chip" x={-20} y={196} width={46} height={72} rx={4} />
          <rect className="hc-chip" x={1174} y={220} width={46} height={72} rx={4} />
        </g>
      </g>
    </svg>
  );
}
