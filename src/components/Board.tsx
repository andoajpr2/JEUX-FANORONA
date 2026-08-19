/* ============================================================================
 * The board: carved wood SVG grid + interactive stone/marker layers.
 * Coordinates: files a–i (left→right), ranks 1–5 (rank 1 = White's edge).
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react';
import {
  COLS,
  FILES,
  ROWS,
  type Move,
  type Player,
  type Pt,
  hasDiagonals,
  keyOf,
  keyToPt,
  nameOf,
  playerName,
  samePt,
} from '../game/fanorona';
import type { FadingStone, LastMove, Phase, StoneEnt } from '../game/state';

/* Board geometry: SVG viewBox is 900×500, intersections sit at
 * (50 + c·100, 50 + r·100). These helpers turn grid coords into % positions
 * so HTML layers (stones, markers) line up exactly with the SVG grid. */
const X = (c: number) => (50 + c * 100) / 9; // percent of width
const Y = (r: number) => (50 + r * 100) / 5; // percent of height
const px = (c: number) => 50 + c * 100;
const py = (r: number) => 50 + r * 100;

const skin = (p: Player) => (p === 'white' ? 'stone-ivory' : 'stone-ebony');

interface BoardProps {
  entities: StoneEnt[];
  fading: FadingStone[];
  phase: Phase;
  selected: Pt | null;
  anchor: Pt | null;
  moves: Move[];
  movableKeys: Set<string>;
  lastMove: LastMove | null;
  flash: { c: number; r: number; count: number; id: number } | null;
  winner: Player | null;
  onStoneClick: (pt: Pt) => void;
  onMove: (move: Move) => void;
}

/* Engraved grid: orthogonals everywhere, X diagonals only where (c+r) is even. */
function BoardLines({ lastMove }: { lastMove: LastMove | null }) {
  const diags = useMemo(() => {
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (!hasDiagonals(c, r)) continue;
        for (const [dc, dr] of [
          [1, 1],
          [1, -1],
        ]) {
          if (c - dc >= 0 && c + dc < COLS && r - dr >= 0 && r + dr < ROWS)
            segs.push({
              x1: px(c - dc),
              y1: py(r - dr),
              x2: px(c + dc),
              y2: py(r + dr),
            });
        }
      }
    return segs;
  }, []);

  return (
    <svg viewBox="0 0 900 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {/* pale under-stroke → carved-into-wood illusion */}
      <g stroke="#f2cf9a" strokeWidth="4" opacity="0.12" transform="translate(0 2)">
        {Array.from({ length: ROWS }, (_, r) => (
          <line key={`h${r}`} x1={px(0)} y1={py(r)} x2={px(8)} y2={py(r)} />
        ))}
        {Array.from({ length: COLS }, (_, c) => (
          <line key={`v${c}`} x1={px(c)} y1={py(0)} x2={px(c)} y2={py(4)} />
        ))}
        {diags.map((d, i) => (
          <line key={`dl${i}`} {...d} />
        ))}
      </g>
      <g stroke="#33200f" strokeWidth="3.4">
        {Array.from({ length: ROWS }, (_, r) => (
          <line key={`h${r}`} x1={px(0)} y1={py(r)} x2={px(8)} y2={py(r)} />
        ))}
        {Array.from({ length: COLS }, (_, c) => (
          <line key={`v${c}`} x1={px(c)} y1={py(0)} x2={px(c)} y2={py(4)} />
        ))}
        {diags.map((d, i) => (
          <line key={`dk${i}`} {...d} />
        ))}
      </g>
      {/* intersections */}
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => (
          <circle key={`p${c}-${r}`} cx={px(c)} cy={py(r)} r="5" fill="#241407" opacity="0.6" />
        )),
      )}
      {/* the vady — the empty heart of the board */}
      <rect
        x={px(4) - 15}
        y={py(2) - 15}
        width="30"
        height="30"
        transform={`rotate(45 ${px(4)} ${py(2)})`}
        fill="none"
        stroke="#f0be5e"
        strokeWidth="2.4"
        opacity="0.5"
      />
      {/* trace of the previous move */}
      {lastMove && (
        <g fill="none" stroke="#f7d489" strokeWidth="3" strokeDasharray="5 8" opacity="0.5">
          <circle cx={px(lastMove.from.c)} cy={py(lastMove.from.r)} r="27" />
          <circle cx={px(lastMove.to.c)} cy={py(lastMove.to.r)} r="27" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

export default function Board({
  entities,
  fading,
  phase,
  selected,
  anchor,
  moves,
  movableKeys,
  lastMove,
  flash,
  winner,
  onStoneClick,
  onMove,
}: BoardProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ key: string; moves: Move[] } | null>(null);
  const [previewMove, setPreviewMove] = useState<Move | null>(null);

  /* Candidate moves grouped by destination — a destination can hold two
   * candidates when one step captures both by percussion AND aspiration. */
  const groups = useMemo(() => {
    const map = new Map<string, Move[]>();
    for (const m of moves) {
      const k = keyOf(m.to);
      map.set(k, [...(map.get(k) ?? []), m]);
    }
    return map;
  }, [moves]);

  useEffect(() => {
    setHoveredKey(null);
    setChoice(null);
    setPreviewMove(null);
  }, [moves]);

  /* Stones threatened by the currently previewed destination. */
  const doomedKeys = useMemo(() => {
    const set = new Set<string>();
    if (previewMove) previewMove.captured.forEach((p) => set.add(keyOf(p)));
    else if (hoveredKey)
      groups.get(hoveredKey)?.forEach((m) => m.captured.forEach((p) => set.add(keyOf(p))));
    return set;
  }, [previewMove, hoveredKey, groups]);

  const orderedEntities = useMemo(() => {
    const hot = (e: StoneEnt) =>
      (selected && samePt(selected, e)) || (anchor && samePt(anchor, e)) ? 1 : 0;
    return [...entities].sort((a, b) => hot(a) - hot(b) || a.id - b.id);
  }, [entities, selected, anchor]);

  const pickMarker = (k: string, ms: Move[]) => {
    if (ms.length === 1) onMove(ms[0]);
    else setChoice({ key: k, moves: ms });
    setHoveredKey(null);
  };

  return (
    <div className="board-frame rounded-xl p-3 sm:p-4 md:p-5">
      {/* engraved frame captions */}
      <div className="flex items-center justify-between px-1 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-wood-300/45 sm:text-[10px]">
        <span>Tsivy · nine lines</span>
        <span>the vady — e3</span>
      </div>

      <div className="flex gap-1.5 sm:gap-2">
        {/* rank labels */}
        <div className="relative w-4 shrink-0 select-none sm:w-5" aria-hidden="true">
          {Array.from({ length: ROWS }, (_, r) => (
            <span
              key={r}
              className="absolute right-0.5 text-[10px] font-semibold tracking-widest text-wood-300/70 sm:text-xs"
              style={{ top: `${Y(r)}%`, translate: '0 -50%' }}
            >
              {ROWS - r}
            </span>
          ))}
        </div>

        {/* the board itself */}
        <div className="relative aspect-[9/5] flex-1">
          <div className="board-surface absolute inset-0 rounded-lg" />
          <BoardLines lastMove={lastMove} />

          {/* destination markers */}
          {[...groups.entries()].map(([k, ms]) => {
            const pt = keyToPt(k);
            const isCapture = ms[0].captured.length > 0;
            const dual = ms.length > 1;
            const open = choice?.key === k;
            const badge = dual
              ? `×${ms[0].captured.length}/${ms[1].captured.length}`
              : isCapture
                ? `×${ms[0].captured.length}`
                : null;
            return (
              <div key={k}>
                <button
                  type="button"
                  aria-label={
                    isCapture
                      ? `Move to ${nameOf(pt)} — capture ${ms[0].captured.length}${dual ? ' (choose side)' : ''}`
                      : `Move to ${nameOf(pt)}`
                  }
                  onClick={() => pickMarker(k, ms)}
                  onMouseEnter={() => setHoveredKey(k)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`absolute aspect-square cursor-pointer rounded-full transition-colors ${
                    isCapture
                      ? `animate-capture-marker border-2 ${
                          dual
                            ? 'border-gold-400 bg-gold-500/20 hover:bg-gold-500/40'
                            : 'border-ember-400 bg-ember-500/20 hover:bg-ember-500/40'
                        }`
                      : 'animate-marker-in border border-ivory-300/70 bg-ivory-300/20 hover:bg-ivory-300/45'
                  } ${open ? 'ring-2 ring-gold-300' : ''}`}
                  style={{
                    left: `${X(pt.c)}%`,
                    top: `${Y(pt.r)}%`,
                    width: isCapture ? '5.8%' : '4.2%',
                    translate: '-50% -50%',
                    zIndex: 40,
                  }}
                >
                  {badge && (
                    <span
                      className={`absolute -top-2 -right-2.5 rounded-full px-1.5 py-px text-[10px] font-bold leading-4 shadow-md ${
                        dual ? 'bg-gold-500 text-pit-950' : 'bg-ember-500 text-ivory-200'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>

                {/* forced choice when one step captures both ways */}
                {open && (
                  <>
                    <button
                      type="button"
                      aria-label="Cancel choice"
                      className="fixed inset-0 cursor-default"
                      style={{ zIndex: 50 }}
                      onClick={() => {
                        setChoice(null);
                        setPreviewMove(null);
                      }}
                    />
                    <div
                      className="animate-rise-in absolute w-44 rounded-lg border border-gold-500/40 bg-pit-800 p-1.5 shadow-2xl"
                      style={{
                        left: `${X(pt.c)}%`,
                        top: `${Y(pt.r)}%`,
                        translate: pt.r <= 1 ? '-50% 22px' : '-50% calc(-100% - 22px)',
                        zIndex: 60,
                      }}
                    >
                      <p className="px-1.5 pt-0.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-300/80">
                        One capture only
                      </p>
                      {choice.moves.map((m) => (
                        <button
                          key={m.kind}
                          type="button"
                          onClick={() => {
                            onMove(m);
                            setChoice(null);
                            setPreviewMove(null);
                          }}
                          onMouseEnter={() => setPreviewMove(m)}
                          onMouseLeave={() => setPreviewMove(null)}
                          className="block w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-pit-700"
                        >
                          <span className="block text-xs font-semibold text-ivory-200">
                            {m.kind === 'approach' ? 'Percussion' : 'Aspiration'} ×
                            {m.captured.length}
                          </span>
                          <span className="block text-[10px] text-ivory-300/55">
                            {m.kind === 'approach'
                              ? 'take the line ahead'
                              : 'take the line behind'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* stones */}
          {orderedEntities.map((e) => {
            const k = keyOf(e);
            const isHot =
              (selected && samePt(selected, e)) || (anchor && samePt(anchor, e));
            const movable = movableKeys.has(k);
            const clickable = !winner && movable;
            return (
              <button
                key={e.id}
                type="button"
                aria-label={`${playerName(e.player)} stone on ${nameOf(e)}`}
                onClick={() => onStoneClick({ c: e.c, r: e.r })}
                className={`absolute aspect-square rounded-full transition-all duration-300 ease-out ${skin(e.player)} ${
                  isHot ? 'animate-gold-ring' : ''
                } ${doomedKeys.has(k) ? 'stone-doomed' : ''} ${
                  clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                }`}
                style={{
                  left: `${X(e.c)}%`,
                  top: `${Y(e.r)}%`,
                  width: '7.5%',
                  translate: '-50% -50%',
                  zIndex: isHot ? 30 : 10,
                }}
              >
                {movable && phase === 'select' && !winner && (
                  <span className="absolute top-[78%] left-1/2 h-[26%] w-[26%] -translate-x-1/2 animate-pulse rounded-full bg-gold-400/90 shadow-[0_0_8px_rgba(240,190,94,0.8)]" />
                )}
              </button>
            );
          })}

          {/* captured stones mid-vanish */}
          {fading.map((f) => (
            <div
              key={`f${f.id}`}
              className={`animate-stone-vanish pointer-events-none absolute aspect-square rounded-full ${skin(f.player)}`}
              style={{
                left: `${X(f.c)}%`,
                top: `${Y(f.r)}%`,
                width: '7.5%',
                translate: '-50% -50%',
                zIndex: 25,
              }}
            />
          ))}

          {/* capture burst */}
          {flash && (
            <div
              key={flash.id}
              className="animate-float-fade pointer-events-none absolute font-display text-2xl font-black text-gold-300 sm:text-3xl"
              style={{
                left: `${X(flash.c)}%`,
                top: `${Y(flash.r)}%`,
                translate: '-50% -50%',
                zIndex: 65,
                textShadow: '0 2px 12px rgba(0,0,0,0.65)',
              }}
            >
              ×{flash.count}
            </div>
          )}
        </div>
      </div>

      {/* file labels */}
      <div
        className="relative mt-1 ml-[1.375rem] h-4 select-none sm:mt-1.5 sm:ml-[1.75rem] sm:h-5"
        aria-hidden="true"
      >
        {Array.from({ length: COLS }, (_, c) => (
          <span
            key={c}
            className="absolute text-[10px] font-semibold tracking-widest text-wood-300/70 sm:text-xs"
            style={{ left: `${X(c)}%`, translate: '-50% 0' }}
          >
            {FILES[c]}
          </span>
        ))}
      </div>
    </div>
  );
}
