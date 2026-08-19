/* ============================================================================
 * FANORONA TSIVY — rules engine (pure, UI-free)
 * ----------------------------------------------------------------------------
 * Board: 9 columns (files a–i) × 5 rows (ranks 1–5, rank 1 = White's side).
 * The grid is stored as Grid[r][c]; row 0 is the TOP of the board (Black side).
 *
 * Implemented strictly:
 *  - 22 Black + 22 White stones, centre intersection (file e, rank 3) empty.
 *  - Orthogonal moves everywhere; diagonal moves only on intersections where
 *    (col + row) is even — the points where the traditional board prints an X.
 *  - Percussion (approach): landing beside an enemy line ahead captures it.
 *  - Aspiration (withdrawal): stepping away from an adjacent enemy line behind
 *    captures it. If BOTH apply on one move, the player must CHOOSE — a move
 *    never captures both ways at once (two candidate moves are generated).
 *  - Capturing is mandatory whenever any capture exists.
 *  - Paika chain: after capturing, the same stone may keep capturing. While
 *    chaining: only capturing moves, no repeated direction, no revisiting any
 *    intersection already occupied this turn. Continuing is optional.
 *  - Vela: a plain one-step move, legal only when no capture is available.
 *  - Win: capture all 22 enemy stones (or leave the enemy with no legal move).
 * ==========================================================================*/

export type Player = 'white' | 'black';

export interface Pt {
  c: number; // column 0..8
  r: number; // row    0..4  (0 = top edge, Black's home rows)
}

export type Grid = (Player | null)[][]; // indexed [row][col]

export const COLS = 9;
export const ROWS = 5;
export const FILES = 'abcdefghi';
export const STONES_PER_SIDE = 22;

/* ------------------------------ tiny helpers ------------------------------ */

export const ptKey = (c: number, r: number): string => `${c},${r}`;
export const keyOf = (p: Pt): string => ptKey(p.c, p.r);
export const keyToPt = (k: string): Pt => {
  const [c, r] = k.split(',').map(Number);
  return { c, r };
};
export const inBounds = (c: number, r: number): boolean =>
  c >= 0 && c < COLS && r >= 0 && r < ROWS;
export const samePt = (a: Pt, b: Pt): boolean => a.c === b.c && a.r === b.r;
export const other = (p: Player): Player => (p === 'white' ? 'black' : 'white');

/** Standard notation, e.g. { c: 3, r: 4 } → "d1" (rank 1 is White's edge). */
export const nameOf = (p: Pt): string => `${FILES[p.c]}${ROWS - p.r}`;

export const playerName = (p: Player): string => (p === 'white' ? 'Fotsy' : 'Mainty');
export const playerColor = (p: Player): string => (p === 'white' ? 'White' : 'Black');

/* --------------------------- movement topology ---------------------------- */

const DIRS_ORTHO: Pt[] = [
  { c: 1, r: 0 },
  { c: -1, r: 0 },
  { c: 0, r: 1 },
  { c: 0, r: -1 },
];
const DIRS_DIAG: Pt[] = [
  { c: 1, r: 1 },
  { c: 1, r: -1 },
  { c: -1, r: 1 },
  { c: -1, r: -1 },
];

/** Diagonals are printed on alternating intersections: both coordinates even,
 *  i.e. (c + r) even. Those are the only points reached diagonally too. */
export const hasDiagonals = (c: number, r: number): boolean => (c + r) % 2 === 0;

/** Every direction a stone may travel FROM intersection (c, r). */
export function dirsFor(c: number, r: number): Pt[] {
  return hasDiagonals(c, r) ? [...DIRS_ORTHO, ...DIRS_DIAG] : [...DIRS_ORTHO];
}

/* ------------------------------ initial setup ----------------------------- */

/** Black fills rows 0–1 plus the left half of the middle row;
 *  White fills rows 3–4 plus the right half. Centre (4,2) stays empty. */
export function initialGrid(): Grid {
  const g: Grid = Array.from({ length: ROWS }, () =>
    new Array<Player | null>(COLS).fill(null),
  );
  for (let r = 0; r < 2; r++) for (let c = 0; c < COLS; c++) g[r][c] = 'black';
  for (let c = 0; c < 4; c++) g[2][c] = 'black';
  for (let c = 5; c < COLS; c++) g[2][c] = 'white';
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS; c++) g[r][c] = 'white';
  return g; // g[2][4] === null  → centre "vady" intersection is empty
}

/* --------------------------------- moves ---------------------------------- */

export type CaptureKind = 'approach' | 'withdrawal';

export interface Move {
  from: Pt;
  to: Pt; // always an adjacent empty intersection (Fanorona steps are single)
  dir: Pt; // unit direction of travel
  kind: CaptureKind | null; // null → simple vela step
  captured: Pt[]; // the enemy line removed by this move (empty for vela)
}

/** State carried across the successive captures of one turn (the paika). */
export interface ChainState {
  visited: string[]; // keys of every intersection occupied this turn
  lastDir: string | null; // ptKey of the previous move's direction
}

/** Contiguous run of `victim` stones starting just past `start` along `d`. */
function captureRun(g: Grid, start: Pt, d: Pt, victim: Player): Pt[] {
  const run: Pt[] = [];
  let c = start.c + d.c;
  let r = start.r + d.r;
  while (inBounds(c, r) && g[r][c] === victim) {
    run.push({ c, r });
    c += d.c;
    r += d.r;
  }
  return run;
}

/**
 * Legal single-step moves for the stone at `from`.
 * Pass `chain` while the stone is mid-paika to apply the chain restrictions
 * (no same direction as the previous move, no revisited intersections, and —
 * enforced by the caller — capturing moves only).
 */
export function pieceMoves(g: Grid, from: Pt, chain?: ChainState): Move[] {
  const mover = g[from.r][from.c];
  if (!mover) return [];
  const victim = other(mover);
  const moves: Move[] = [];

  for (const d of dirsFor(from.c, from.r)) {
    // Paika rule 1: never repeat the direction of the immediately previous move.
    if (chain && chain.lastDir === ptKey(d.c, d.r)) continue;

    const to = { c: from.c + d.c, r: from.r + d.r };
    if (!inBounds(to.c, to.r)) continue;
    if (g[to.r][to.c] !== null) continue; // every move lands on an EMPTY point
    // Paika rule 2: no intersection occupied earlier this turn may be re-entered.
    if (chain && chain.visited.includes(ptKey(to.c, to.r))) continue;

    // Percussion: enemy line directly ahead of the landing point.
    const ahead = captureRun(g, to, d, victim);
    // Aspiration: enemy line directly behind the point we are leaving.
    const behind = captureRun(g, from, { c: -d.c, r: -d.r }, victim);

    if (ahead.length > 0 && behind.length > 0) {
      // A move can never capture both ways — the player must choose. We
      // therefore offer the two captures as separate candidate moves.
      moves.push({ from, to, dir: d, kind: 'approach', captured: ahead });
      moves.push({ from, to, dir: d, kind: 'withdrawal', captured: behind });
    } else if (ahead.length > 0) {
      moves.push({ from, to, dir: d, kind: 'approach', captured: ahead });
    } else if (behind.length > 0) {
      moves.push({ from, to, dir: d, kind: 'withdrawal', captured: behind });
    } else if (!chain) {
      // Vela — a quiet step, only outside a chain (chaining is captures-only).
      moves.push({ from, to, dir: d, kind: null, captured: [] });
    }
  }
  return moves;
}

/**
 * Every legal move for `player` this turn. Capturing is mandatory: if any
 * capturing move exists anywhere, non-capturing moves are withheld.
 */
export function allMovesFor(g: Grid, player: Player): Move[] {
  const all: Move[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === player) all.push(...pieceMoves(g, { c, r }));
    }
  }
  const captures = all.filter((m) => m.captured.length > 0);
  return captures.length > 0 ? captures : all;
}

/** Capturing moves the chaining stone may still play from `from`. */
export function chainMoves(g: Grid, from: Pt, chain: ChainState): Move[] {
  return pieceMoves(g, from, chain).filter((m) => m.captured.length > 0);
}

/* ------------------------------ application ------------------------------- */

export function applyMove(g: Grid, m: Move): Grid {
  const next = g.map((row) => row.slice());
  const mover = next[m.from.r][m.from.c];
  next[m.from.r][m.from.c] = null;
  next[m.to.r][m.to.c] = mover;
  for (const p of m.captured) next[p.r][p.c] = null;
  return next;
}

export function countStones(g: Grid, player: Player): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === player) n++;
  return n;
}

export const hasLegalMove = (g: Grid, player: Player): boolean =>
  allMovesFor(g, player).length > 0;
