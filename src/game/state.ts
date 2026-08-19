/* ============================================================================
 * Game state machine — turns, selection, chain captures, undo, chronicle log.
 * Pure reducer: the UI (App.tsx) only dispatches actions and renders state.
 * ==========================================================================*/

import {
  type ChainState,
  type Grid,
  type Move,
  type Player,
  type Pt,
  allMovesFor,
  applyMove,
  chainMoves,
  countStones,
  hasLegalMove,
  initialGrid,
  keyOf,
  nameOf,
  other,
  pieceMoves,
  playerName,
  ptKey,
  samePt,
} from './fanorona';

export type Phase = 'select' | 'aim' | 'chain' | 'over';

export interface StoneEnt {
  id: number;
  player: Player;
  c: number;
  r: number;
}
export interface FadingStone {
  id: number;
  player: Player;
  c: number;
  r: number;
}
export interface LogStep {
  player: Player;
  main: string; // "d1 → d2"
  note: string | null; // "percussion ×3" | "aspiration ×2" | "vela" | …
  sub: boolean; // true for continuation steps inside a paika chain
}
export interface LogEntry {
  no: number;
  player: Player;
  steps: LogStep[];
}
interface Snapshot {
  grid: Grid;
  entities: StoneEnt[];
  turn: Player;
  phase: Phase;
  selected: Pt | null;
  anchor: Pt | null;
  chain: ChainState | null;
  log: LogEntry[];
  turnNo: number;
  lastMove: LastMove | null;
}

export interface LastMove {
  from: Pt;
  to: Pt;
}

export interface GameState {
  grid: Grid;
  entities: StoneEnt[];
  turn: Player;
  phase: Phase;
  selected: Pt | null; // stone chosen in the "aim" phase
  anchor: Pt | null; // position of the chaining stone
  chain: ChainState | null;
  fading: FadingStone[]; // captured stones mid-vanish animation
  log: LogEntry[];
  turnNo: number;
  history: Snapshot[];
  winner: Player | null;
  winReason: string;
  hint: { text: string; id: number } | null;
  flash: { c: number; r: number; count: number; id: number } | null;
  lastMove: LastMove | null;
  seq: number; // id counter for transient effects
}

export type Action =
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'cancel' } // Escape: drop the current selection
  | { type: 'stone'; pt: Pt }
  | { type: 'move'; move: Move }
  | { type: 'endTurn' } // player stops the paika chain voluntarily
  | { type: 'clearFading'; ids: number[] }
  | { type: 'clearFlash'; id: number }
  | { type: 'clearHint'; id: number };

function entitiesFromGrid(g: Grid): StoneEnt[] {
  const list: StoneEnt[] = [];
  let id = 1;
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[r].length; c++)
      if (g[r][c]) list.push({ id: id++, player: g[r][c] as Player, c, r });
  return list;
}

/** White (Fotsy) always opens the game. */
export function freshState(): GameState {
  const grid = initialGrid();
  return {
    grid,
    entities: entitiesFromGrid(grid),
    turn: 'white',
    phase: 'select',
    selected: null,
    anchor: null,
    chain: null,
    fading: [],
    log: [],
    turnNo: 1,
    history: [],
    winner: null,
    winReason: '',
    hint: null,
    flash: null,
    lastMove: null,
    seq: 1,
  };
}

/* ------------------------------ derivations ------------------------------- */

/** The candidate moves currently offered on the board. */
export function activeMoves(s: GameState): Move[] {
  if (s.winner) return [];
  if (s.phase === 'aim' && s.selected) {
    const sel = s.selected;
    return allMovesFor(s.grid, s.turn).filter((m) => samePt(m.from, sel));
  }
  if (s.phase === 'chain' && s.anchor && s.chain)
    return chainMoves(s.grid, s.anchor, s.chain);
  return [];
}

/** Keys of stones the current player may touch right now. */
export function movableKeys(s: GameState): Set<string> {
  const set = new Set<string>();
  if (s.winner) return set;
  if (s.phase === 'select') for (const m of allMovesFor(s.grid, s.turn)) set.add(keyOf(m.from));
  if (s.phase === 'aim' && s.selected) set.add(keyOf(s.selected));
  if (s.phase === 'chain' && s.anchor) set.add(keyOf(s.anchor));
  return set;
}

export const captureAvailable = (g: Grid, p: Player): boolean =>
  allMovesFor(g, p).some((m) => m.captured.length > 0);

/* -------------------------------- helpers --------------------------------- */

const snapshotOf = (s: GameState): Snapshot => ({
  grid: s.grid,
  entities: s.entities,
  turn: s.turn,
  phase: s.phase,
  selected: s.selected,
  anchor: s.anchor,
  chain: s.chain,
  log: s.log,
  turnNo: s.turnNo,
  lastMove: s.lastMove,
});

const hint = (s: GameState, text: string): GameState => ({
  ...s,
  hint: { text, id: s.seq },
  seq: s.seq + 1,
});

/** Hand the turn to the opponent, detecting wins (annihilation / blockade). */
function finishTurn(s: GameState): GameState {
  const opp = other(s.turn);
  const base: GameState = {
    ...s,
    selected: null,
    anchor: null,
    chain: null,
  };
  if (countStones(s.grid, opp) === 0)
    return {
      ...base,
      phase: 'over',
      winner: s.turn,
      winReason: `every one of ${playerName(opp)}'s 22 stones is captured`,
    };
  if (!hasLegalMove(s.grid, opp))
    return {
      ...base,
      phase: 'over',
      winner: s.turn,
      winReason: `${playerName(opp)} is blocked — no legal move remains`,
    };
  return { ...base, phase: 'select', turn: opp, turnNo: s.turnNo + 1 };
}

/* -------------------------------- reducer --------------------------------- */

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'reset':
      return freshState();

    case 'cancel':
      if (s.phase === 'aim') return { ...s, phase: 'select', selected: null, hint: null };
      return s;

    case 'undo': {
      if (s.history.length === 0) return s;
      const snap = s.history[s.history.length - 1];
      return {
        ...s,
        ...snap,
        history: s.history.slice(0, -1),
        winner: null,
        winReason: '',
        fading: [],
        flash: null,
        hint: null,
      };
    }

    case 'stone': {
      if (s.winner) return s;
      const { pt } = a;
      const occ = s.grid[pt.r][pt.c];

      const trySelect = (state: GameState): GameState => {
        const legal = allMovesFor(state.grid, state.turn).filter((m) => samePt(m.from, pt));
        if (legal.length > 0)
          return { ...state, phase: 'aim', selected: pt, hint: null };
        // The stone exists but cannot move right now — explain why.
        return pieceMoves(state.grid, pt).length > 0
          ? hint(state, 'Captures are mandatory — a different stone must take them.')
          : hint(state, `That stone has no legal move (${nameOf(pt)}).`);
      };

      if (s.phase === 'select') {
        if (!occ) return s;
        if (occ !== s.turn)
          return hint(s, `${playerName(occ)}'s stone — ${playerName(s.turn)} is to move.`);
        return trySelect(s);
      }
      if (s.phase === 'aim') {
        if (!occ || occ !== s.turn) return s; // destination clicks go via markers
        if (s.selected && samePt(pt, s.selected))
          return { ...s, phase: 'select', selected: null, hint: null }; // toggle off
        return trySelect(s);
      }
      return s; // mid-chain: the marked stone must finish or end the paika
    }

    case 'move': {
      if (s.winner) return s;
      const m = a.move;
      const isChainStep = s.phase === 'chain';
      const isAimStep = s.phase === 'aim';
      if (!isChainStep && !isAimStep) return s;
      if (isAimStep && (!s.selected || !samePt(s.selected, m.from))) return s;
      if (isChainStep && (!s.anchor || !samePt(s.anchor, m.from))) return s;
      if (isChainStep && m.captured.length === 0) return s; // chains are captures-only

      const snap = snapshotOf(s);
      const grid = applyMove(s.grid, m);

      // Move the stone entity; lift captured ones into the "fading" layer.
      const victimKeys = new Set(m.captured.map(keyOf));
      const entities = s.entities
        .filter((e) => !victimKeys.has(keyOf(e)))
        .map((e) => (keyOf(e) === keyOf(m.from) ? { ...e, c: m.to.c, r: m.to.r } : e));
      const fading = s.entities
        .filter((e) => victimKeys.has(keyOf(e)))
        .map((e) => ({ id: e.id, player: e.player, c: e.c, r: e.r }));

      const step: LogStep = {
        player: s.turn,
        main: `${nameOf(m.from)} → ${nameOf(m.to)}`,
        note: m.kind
          ? `${m.kind === 'approach' ? 'percussion' : 'aspiration'} ×${m.captured.length}`
          : 'vela',
        sub: isChainStep,
      };
      const log = isChainStep
        ? s.log.map((e, i) => (i === s.log.length - 1 ? { ...e, steps: [...e.steps, step] } : e))
        : [...s.log, { no: s.turnNo, player: s.turn, steps: [step] }];

      const base: GameState = {
        ...s,
        grid,
        entities,
        fading,
        log,
        lastMove: { from: m.from, to: m.to },
        history: [...s.history, snap],
        hint: null,
        seq: s.seq + 1,
      };

      if (m.captured.length > 0) {
        const visited = isChainStep && s.chain ? s.chain.visited : [keyOf(m.from)];
        const chain: ChainState = {
          visited: [...visited, keyOf(m.to)],
          lastDir: ptKey(m.dir.c, m.dir.r),
        };
        const withFlash: GameState = {
          ...base,
          flash: { c: m.to.c, r: m.to.r, count: m.captured.length, id: s.seq },
        };
        // May the stone legally keep the paika going from its new point?
        if (chainMoves(grid, m.to, chain).length > 0)
          return { ...withFlash, phase: 'chain', anchor: m.to, chain };
        return finishTurn(withFlash);
      }
      return finishTurn(base); // a vela ends the turn at once
    }

    case 'endTurn': {
      if (s.phase !== 'chain' || s.winner) return s;
      const step: LogStep = { player: s.turn, main: 'paika ends', note: null, sub: true };
      const log = s.log.map((e, i) =>
        i === s.log.length - 1 ? { ...e, steps: [...e.steps, step] } : e,
      );
      return finishTurn({ ...s, log, hint: null });
    }

    case 'clearFading':
      return { ...s, fading: s.fading.filter((f) => !a.ids.includes(f.id)) };

    case 'clearFlash':
      return s.flash && s.flash.id === a.id ? { ...s, flash: null } : s;

    case 'clearHint':
      return s.hint && s.hint.id === a.id ? { ...s, hint: null } : s;

    default:
      return s;
  }
}
