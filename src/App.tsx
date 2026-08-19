/* ============================================================================
 * FANORONA TSIVY — hot-seat digital edition.
 * Architecture: pure engine (game/fanorona.ts) + pure state machine
 * (game/state.ts) + view components. App only wires them together.
 * ==========================================================================*/

import { useEffect, useMemo, useReducer, useState } from 'react';
import Board from './components/Board';
import RulesCard from './components/RulesCard';
import SidePanel from './components/SidePanel';
import WinOverlay from './components/WinOverlay';
import { STONES_PER_SIDE, countStones, other } from './game/fanorona';
import { activeMoves, freshState, movableKeys, reducer } from './game/state';

/* ----------------------------- inline glyphs ------------------------------ */

const LogoMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 44 44" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    {[8, 22, 36].map((x) => (
      <line key={`v${x}`} x1={x} y1="6" x2={x} y2="38" />
    ))}
    {[8, 22, 36].map((y) => (
      <line key={`h${y}`} x1="6" y1={y} x2="38" y2={y} />
    ))}
    <line x1="8" y1="8" x2="36" y2="36" opacity="0.7" />
    <line x1="36" y1="8" x2="8" y2="36" opacity="0.7" />
    <circle cx="22" cy="22" r="3.4" fill="currentColor" stroke="none" />
  </svg>
);

const FlagMadagascar = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 30 20" className={className}>
    <rect x="0" y="0" width="10" height="20" fill="#faf1dc" />
    <rect x="10" y="0" width="20" height="10" fill="#d1493a" />
    <rect x="10" y="10" width="20" height="10" fill="#3e8e5f" />
  </svg>
);

/* Faint full-board glyph used as drifting ambient decoration. */
const PatternGlyph = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 220 220" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    {[30, 110, 190].map((y) => (
      <line key={`h${y}`} x1="10" y1={y} x2="210" y2={y} />
    ))}
    {[30, 110, 190].map((x) => (
      <line key={`v${x}`} x1={x} y1="10" x2={x} y2="210" />
    ))}
    <line x1="30" y1="30" x2="190" y2="190" />
    <line x1="190" y1="30" x2="30" y2="190" />
    {[30, 110, 190].map((x) =>
      [30, 110, 190].map((y) => <circle key={`c${x}-${y}`} cx={x} cy={y} r="4" fill="currentColor" stroke="none" />),
    )}
  </svg>
);

/* --------------------------------- app ------------------------------------ */

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  const [reviewing, setReviewing] = useState(false); // overlay dismissed once

  const moves = useMemo(() => activeMoves(state), [state]);
  const mKeys = useMemo(() => movableKeys(state), [state]);

  /* transient-effect timers */
  useEffect(() => {
    if (state.fading.length === 0) return;
    const ids = state.fading.map((f) => f.id);
    const t = window.setTimeout(() => dispatch({ type: 'clearFading', ids }), 620);
    return () => window.clearTimeout(t);
  }, [state.fading]);

  useEffect(() => {
    if (!state.flash) return;
    const id = state.flash.id;
    const t = window.setTimeout(() => dispatch({ type: 'clearFlash', id }), 1050);
    return () => window.clearTimeout(t);
  }, [state.flash]);

  useEffect(() => {
    if (!state.hint) return;
    const id = state.hint.id;
    const t = window.setTimeout(() => dispatch({ type: 'clearHint', id }), 2400);
    return () => window.clearTimeout(t);
  }, [state.hint]);

  /* Escape drops the current selection */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'cancel' });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (!state.winner) setReviewing(false);
  }, [state.winner]);

  const takenByWinner = state.winner
    ? STONES_PER_SIDE - countStones(state.grid, other(state.winner))
    : 0;

  return (
    <div className="bg-ambient relative min-h-screen overflow-x-hidden font-body text-ivory-200">
      {/* layered ambience: grain + drifting carved-board glyphs */}
      <div className="bg-grain pointer-events-none fixed inset-0 z-0 opacity-[0.05]" />
      <PatternGlyph className="animate-drift-slow pointer-events-none absolute top-14 -left-28 z-0 w-[430px] text-gold-400 opacity-[0.05]" />
      <PatternGlyph className="animate-drift-slower pointer-events-none absolute -right-32 bottom-[-40px] z-0 w-[490px] text-ember-400 opacity-[0.045]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex items-end justify-between gap-4 border-b border-wood-500/15 pt-6 pb-4 sm:pt-8">
          <div className="flex items-center gap-3.5">
            <LogoMark className="h-11 w-11 shrink-0 text-gold-400" />
            <div>
              <h1 className="font-display text-3xl leading-none font-black tracking-tight text-ivory-200 sm:text-4xl">
                Fanorona <span className="text-gold-400 italic">Tsivy</span>
              </h1>
              <p className="mt-1.5 text-[10px] font-semibold tracking-[0.3em] text-ivory-300/50 uppercase sm:text-[11px]">
                The nine-line game of Madagascar
              </p>
            </div>
          </div>
          <div className="hidden flex-col items-end gap-1.5 sm:flex">
            <FlagMadagascar className="h-4 w-6 overflow-hidden rounded-[3px] shadow-md ring-1 ring-white/15" />
            <p className="text-[11px] tracking-wide text-ivory-300/50">
              Hot seat · Fotsy (White) opens
            </p>
          </div>
        </header>

        <main className="grid items-start gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="relative">
            <Board
              entities={state.entities}
              fading={state.fading}
              phase={state.phase}
              selected={state.selected}
              anchor={state.anchor}
              moves={moves}
              movableKeys={mKeys}
              lastMove={state.lastMove}
              flash={state.flash}
              winner={state.winner}
              onStoneClick={(pt) => dispatch({ type: 'stone', pt })}
              onMove={(move) => dispatch({ type: 'move', move })}
            />
            {state.hint && (
              <div
                key={state.hint.id}
                className="animate-toast pointer-events-none absolute bottom-4 left-1/2 z-50 rounded-full border border-gold-500/40 bg-pit-800/95 px-4 py-2 text-xs font-semibold text-gold-300 shadow-2xl sm:text-sm"
                style={{ translate: '-50% 0' }}
              >
                {state.hint.text}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <SidePanel
              s={state}
              onEndTurn={() => dispatch({ type: 'endTurn' })}
              onUndo={() => dispatch({ type: 'undo' })}
              onReset={() => dispatch({ type: 'reset' })}
            />
            <RulesCard />
          </aside>
        </main>

        <footer className="border-t border-wood-500/15 py-5 text-center text-xs leading-relaxed text-ivory-300/40">
          Fanorona Tsivy — the game of nine lines, played across the Malagasy highlands since the
          seventeenth century. Percussion and aspiration, the paika chain, the quiet vela.
          <span className="mt-1 block text-[10px] tracking-[0.22em] uppercase">
            Two players · same screen · Esc drops a selection
          </span>
        </footer>
      </div>

      {state.winner && !reviewing && (
        <WinOverlay
          winner={state.winner}
          winReason={state.winReason}
          turns={state.log.length}
          stonesTaken={takenByWinner}
          onRematch={() => {
            setReviewing(false);
            dispatch({ type: 'reset' });
          }}
          onReview={() => setReviewing(true)}
        />
      )}
    </div>
  );
}
