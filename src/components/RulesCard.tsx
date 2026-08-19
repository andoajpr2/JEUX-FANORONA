/* A compact, illustrated digest of the Fanorona Tsivy rules. */

const Chevron = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4 6 4 4 4-4" />
  </svg>
);

const ArrowDef = ({ id }: { id: string }) => (
  <defs>
    <marker id={id} viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M0,0 L8,4 L0,8 Z" fill="#f0be5e" />
    </marker>
  </defs>
);

const Track = () => (
  <>
    <line x1="14" y1="30" x2="206" y2="30" stroke="#5c3a1d" strokeWidth="3" />
    {[30, 70, 110, 150, 190].map((x) => (
      <circle key={x} cx={x} cy="30" r="4" fill="#33200f" />
    ))}
  </>
);

const Mover = ({ x, ghost = false }: { x: number; ghost?: boolean }) => (
  <circle
    cx={x}
    cy="30"
    r="10"
    fill={ghost ? 'none' : '#f3e6c8'}
    stroke={ghost ? '#f3e6c8' : '#a9834a'}
    strokeWidth="1.6"
    strokeDasharray={ghost ? '3 3' : undefined}
    opacity={ghost ? 0.7 : 1}
  />
);

const Victim = ({ x }: { x: number }) => (
  <g>
    <circle cx={x} cy="30" r="10" fill="#d1493a" stroke="#7c2318" strokeWidth="1.6" />
    <path d={`M${x - 4.5} 25.5 L${x + 4.5} 34.5 M${x + 4.5} 25.5 L${x - 4.5} 34.5`} stroke="#ffe9d2" strokeWidth="1.8" strokeLinecap="round" />
  </g>
);

interface RuleProps {
  title: string;
  body: string;
  diagram: React.ReactNode;
}

function Rule({ title, body, diagram }: RuleProps) {
  return (
    <div className="flex gap-3">
      <svg viewBox="0 0 220 60" className="mt-0.5 h-14 w-28 shrink-0 rounded-md border border-pit-700 bg-pit-950/60">
        {diagram}
      </svg>
      <div className="min-w-0">
        <h4 className="font-display text-sm font-bold text-gold-300">{title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-ivory-300/70">{body}</p>
      </div>
    </div>
  );
}

export default function RulesCard() {
  return (
    <details className="group rounded-xl border border-pit-700 bg-pit-900/60" open>
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] font-bold tracking-[0.3em] text-ivory-300/55 uppercase">
          How to play
        </span>
        <span className="text-gold-400">
          <Chevron />
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-pit-700/70 px-4 py-4">
        <Rule
          title="One step at a time"
          body="Stones travel along the engraved lines to an adjacent empty intersection. Diagonal steps exist only where the board prints an X."
          diagram={
            <>
              <Track />
              <Mover x={30} />
              <Mover x={70} ghost />
              <line x1="42" y1="30" x2="56" y2="30" stroke="#f0be5e" strokeWidth="2.4" markerEnd="url(#arrR1)" />
              <ArrowDef id="arrR1" />
            </>
          }
        />
        <Rule
          title="Percussion — approach"
          body="Step toward an enemy line: landing beside it captures every stone of that unbroken line."
          diagram={
            <>
              <Track />
              <Mover x={30} />
              <Mover x={70} ghost />
              <line x1="42" y1="30" x2="56" y2="30" stroke="#f0be5e" strokeWidth="2.4" markerEnd="url(#arrR2)" />
              <Victim x={110} />
              <Victim x={150} />
              <Victim x={190} />
              <ArrowDef id="arrR2" />
            </>
          }
        />
        <Rule
          title="Aspiration — withdrawal"
          body="Step away from an adjacent enemy line: the whole line behind you is captured. If both ways apply at once, you must choose one."
          diagram={
            <>
              <Track />
              <Victim x={30} />
              <Victim x={70} />
              <Mover x={110} ghost />
              <Mover x={150} />
              <line x1="122" y1="30" x2="136" y2="30" stroke="#f0be5e" strokeWidth="2.4" markerEnd="url(#arrR3)" />
              <ArrowDef id="arrR3" />
            </>
          }
        />
        <Rule
          title="The paika chain"
          body="After a capture, the same stone may keep capturing: never repeating its previous direction, never re-entering a point it has used this turn. Continuing is optional — but only captures are allowed while chaining."
          diagram={
            <>
              <Track />
              <Mover x={30} ghost />
              <Mover x={70} />
              <line x1="42" y1="26" x2="56" y2="26" stroke="#f0be5e" strokeWidth="2.4" markerEnd="url(#arrR4)" />
              <path d="M80 22 Q98 0 116 20" fill="none" stroke="#f0be5e" strokeWidth="2.4" markerEnd="url(#arrR4)" />
              <Victim x={150} />
              <ArrowDef id="arrR4" />
            </>
          }
        />
        <Rule
          title="Vela and victory"
          body="When no capture exists anywhere, play a quiet one-point step — the vela. Captures are mandatory whenever available. Take all 22 enemy stones, or leave your rival without a legal move, to win."
          diagram={
            <>
              <Track />
              <Mover x={110} />
              <circle cx="190" cy="30" r="12" fill="none" stroke="#57a878" strokeWidth="2.2" strokeDasharray="4 4" />
              <path d="m185 30 4 4 7-8" fill="none" stroke="#57a878" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </>
          }
        />
      </div>
    </details>
  );
}
