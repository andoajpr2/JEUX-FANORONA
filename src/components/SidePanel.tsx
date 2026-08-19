/* Turn cards, stone tallies, actions and the move chronicle. */

import {
  STONES_PER_SIDE,
  countStones,
  nameOf,
  other,
  playerColor,
  playerName,
  type Player,
} from '../game/fanorona';
import { captureAvailable, type GameState } from '../game/state';

const FlagIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14V2.5" />
    <path d="M3 3h9l-2.2 3L12 9H3" fill="currentColor" fillOpacity="0.25" />
  </svg>
);
const UndoIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3 3 6.5 6.5 10" />
    <path d="M3 6.5h6.5a3.5 3.5 0 1 1 0 7H7" />
  </svg>
);
const RefreshIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
    <path d="M13.5 2v3h-3" />
  </svg>
);

function PlayerRow({ p, s }: { p: Player; s: GameState }) {
  const alive = countStones(s.grid, p);
  const taken = STONES_PER_SIDE - countStones(s.grid, other(p));
  const active = !s.winner && s.turn === p;
  const victor = s.winner === p;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 transition-all duration-300 ${
        victor
          ? 'border-leaf-500/70 bg-leaf-500/[0.08] shadow-[0_0_26px_-8px_rgba(87,168,120,0.5)]'
          : active
            ? 'border-gold-500/70 bg-gold-500/[0.07] shadow-[0_0_26px_-8px_rgba(224,168,60,0.45)]'
            : 'border-pit-700 bg-pit-900/60 opacity-70'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`h-7 w-7 shrink-0 rounded-full ${p === 'white' ? 'stone-ivory' : 'stone-ebony'}`} />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="font-display text-xl font-bold text-ivory-200">{playerName(p)}</span>
          <span className="ml-2 text-[10px] font-semibold tracking-[0.22em] text-ivory-300/45 uppercase">
            {playerColor(p)}
          </span>
        </div>
        {victor ? (
          <span className="rounded-full border border-leaf-400/50 bg-leaf-500/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-leaf-400 uppercase">
            victor
          </span>
        ) : active ? (
          <span className="animate-pulse-soft rounded-full border border-gold-400/50 bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-gold-300 uppercase">
            {s.phase === 'chain' ? 'in paika' : 'to move'}
          </span>
        ) : null}
      </div>

      {/* living tally: 22 dots, dimming as stones fall */}
      <div className="flex flex-wrap gap-[3px]">
        {Array.from({ length: STONES_PER_SIDE }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
              i < alive
                ? p === 'white'
                  ? 'bg-ivory-300'
                  : 'bg-[#0d0804] ring-1 ring-white/25'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-black text-gold-300">{taken}</span>
        <span className="text-[10px] font-semibold tracking-[0.22em] text-ivory-300/45 uppercase">
          stones taken
        </span>
        <span className="ml-auto font-display text-sm text-ivory-300/60 italic">{alive} on board</span>
      </div>
    </div>
  );
}

interface SidePanelProps {
  s: GameState;
  onEndTurn: () => void;
  onUndo: () => void;
  onReset: () => void;
}

export default function SidePanel({ s, onEndTurn, onUndo, onReset }: SidePanelProps) {
  const status = (() => {
    if (s.winner)
      return { text: `${playerName(s.winner)} wins — ${s.winReason}.`, cls: 'text-leaf-400' };
    if (s.phase === 'chain')
      return {
        text: 'Paika chain — the same stone may capture again, or you may end the turn.',
        cls: 'text-gold-300',
      };
    if (s.phase === 'aim' && s.selected)
      return { text: `Stone marked at ${nameOf(s.selected)} — choose a glowing intersection.`, cls: 'text-ivory-200' };
    return captureAvailable(s.grid, s.turn)
      ? { text: `${playerName(s.turn)} to move — a capture exists and must be taken.`, cls: 'text-ember-400' }
      : { text: `${playerName(s.turn)} to move — no capture on offer: play a quiet vela step.`, cls: 'text-ivory-200' };
  })();

  const entries = [...s.log].reverse();

  return (
    <div className="flex flex-col gap-3">
      <PlayerRow p="black" s={s} />
      <PlayerRow p="white" s={s} />

      <div className="rounded-lg border border-pit-700 bg-pit-900/60 px-3 py-2.5">
        <p className="text-[9px] font-bold tracking-[0.3em] text-ivory-300/40 uppercase">Now</p>
        <p className={`mt-1 text-sm leading-snug ${status.cls}`}>{status.text}</p>
      </div>

      <div className="flex flex-col gap-2">
        {s.phase === 'chain' && (
          <button
            type="button"
            onClick={onEndTurn}
            className="animate-pulse-soft flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-bold text-pit-950 transition-colors hover:bg-gold-400 active:translate-y-px"
          >
            <FlagIcon /> End turn — keep the spoils
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={s.history.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-wood-500/40 px-3 py-2 text-sm font-semibold text-ivory-300 transition-all hover:border-gold-500/60 hover:bg-gold-500/10 active:translate-y-px disabled:pointer-events-none disabled:opacity-30"
          >
            <UndoIcon /> Undo
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-lg border border-ember-500/40 px-3 py-2 text-sm font-semibold text-ember-400 transition-all hover:bg-ember-500/15 active:translate-y-px"
          >
            <RefreshIcon /> New game
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-pit-700 bg-pit-900/60">
        <div className="flex items-center justify-between border-b border-pit-700/80 px-3 py-2">
          <p className="text-[9px] font-bold tracking-[0.3em] text-ivory-300/40 uppercase">Chronicle</p>
          <span className="rounded-full bg-pit-800 px-2 py-0.5 text-[10px] font-semibold text-ivory-300/60">
            {s.log.length} {s.log.length === 1 ? 'turn' : 'turns'}
          </span>
        </div>
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-xs text-ivory-300/45 italic">
            The chronicle awaits Fotsy's opening move.
          </p>
        ) : (
          <div className="log-scroll flex max-h-56 flex-col gap-1.5 overflow-y-auto p-2">
            {entries.map((e, idx) => (
              <div
                key={e.no}
                className={`rounded-md border px-2.5 py-1.5 transition-colors ${
                  idx === 0 ? 'border-gold-500/35 bg-gold-500/[0.05]' : 'border-pit-700/70 bg-pit-900/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-gold-400 italic">{e.no}.</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${e.player === 'white' ? 'stone-ivory' : 'stone-ebony'}`} />
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-ivory-300/50 uppercase">
                    {playerName(e.player)}
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {e.steps.map((st, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm ${st.sub ? 'ml-3 border-l border-wood-500/40 pl-2' : ''}`}>
                      <span className="text-ivory-200">{st.main}</span>
                      {st.note && (
                        <span
                          className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                            st.note === 'vela' || st.note === null
                              ? 'bg-white/10 text-ivory-300/60'
                              : st.note.startsWith('paika')
                                ? 'bg-gold-500/15 text-gold-300'
                                : 'border border-ember-500/30 bg-ember-500/15 text-ember-400'
                          }`}
                        >
                          {st.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
