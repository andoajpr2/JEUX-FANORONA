/* Full-screen verdict card with rising ember particles. */

import { useMemo } from 'react';
import { playerName, type Player } from '../game/fanorona';

interface WinOverlayProps {
  winner: Player;
  winReason: string;
  turns: number;
  stonesTaken: number;
  onRematch: () => void;
  onReview: () => void;
}

export default function WinOverlay({
  winner,
  winReason,
  turns,
  stonesTaken,
  onRematch,
  onReview,
}: WinOverlayProps) {
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 7.3 + 4) % 100,
        delay: (i * 0.65) % 4,
        dur: 3.4 + ((i * 1.37) % 2.6),
        size: 3 + (i % 3) * 2,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <button
        type="button"
        aria-label="Review the final board"
        onClick={onReview}
        className="absolute inset-0 cursor-default bg-pit-950/85 backdrop-blur-[3px]"
      />
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember-particle pointer-events-none absolute bottom-[-2vh] rounded-full bg-gold-400"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.dur}s`,
            boxShadow: '0 0 8px rgba(240,190,94,0.8)',
          }}
        />
      ))}

      <div className="animate-rise-in board-frame relative z-10 mx-4 w-full max-w-md rounded-xl px-7 py-9 text-center sm:px-10">
        <p className="text-[10px] font-bold tracking-[0.42em] text-ember-400 uppercase">
          The game is decided
        </p>
        <span
          className={`mx-auto mt-5 block h-16 w-16 rounded-full ${winner === 'white' ? 'stone-ivory' : 'stone-ebony'} animate-gold-ring`}
        />
        <h2 className="font-display mt-4 text-4xl font-black text-ivory-200 italic sm:text-5xl">
          {playerName(winner)} prevails
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ivory-300/70">
          Victory on the nine lines — {winReason}.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-pit-700 bg-pit-950/50 px-3 py-3">
            <p className="font-display text-3xl font-black text-gold-300">{turns}</p>
            <p className="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-ivory-300/50 uppercase">
              turns played
            </p>
          </div>
          <div className="rounded-lg border border-pit-700 bg-pit-950/50 px-3 py-3">
            <p className="font-display text-3xl font-black text-gold-300">{stonesTaken}</p>
            <p className="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-ivory-300/50 uppercase">
              stones captured
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRematch}
            className="rounded-lg bg-gold-500 px-4 py-3 text-sm font-bold text-pit-950 transition-all hover:bg-gold-400 active:translate-y-px"
          >
            Set the stones again — rematch
          </button>
          <button
            type="button"
            onClick={onReview}
            className="rounded-lg border border-wood-500/40 px-4 py-2.5 text-sm font-semibold text-ivory-300 transition-all hover:border-gold-500/60 hover:bg-gold-500/10"
          >
            Review the final board
          </button>
        </div>
      </div>
    </div>
  );
}
