import React from "react";

export type DamageFloat = {
  id: string;
  target: string;
  amount: number;
  x: number;
  y: number;
};

export const DamageFloater: React.FC<{
  floats: DamageFloat[];
}> = ({ floats }) => {
  return (
    <>
      {floats.map((f) => {
        const isDamage = f.amount > 0;
        return (
          <span
            key={f.id}
            style={{
              position: "fixed",
              left: f.x,
              top: f.y,
              color: isDamage ? "#ff3d3d" : "#4cff6e",
              fontWeight: 900,
              fontSize: isDamage ? 48 : 44,
              pointerEvents: "none",
              textShadow: isDamage
                ? "0 0 8px rgba(255,61,61,0.8), 0 2px 4px #000, 0 0 20px rgba(255,0,0,0.4)"
                : "0 0 8px rgba(76,255,110,0.8), 0 2px 4px #000, 0 0 20px rgba(0,255,60,0.4)",
              zIndex: 3000,
              animation: isDamage
                ? "damage-float-hit 1s cubic-bezier(.2,1.6,.4,1) forwards"
                : "damage-float-heal 1s cubic-bezier(.2,1.2,.4,1) forwards",
              transform: "translate(-50%, -50%)",
              letterSpacing: "-1px",
            }}
          >
            {isDamage ? `-${f.amount}` : `+${-f.amount}`}
          </span>
        );
      })}
      <style>{`
        @keyframes damage-float-hit {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.3);
          }
          30% {
            transform: translate(-50%, -50%) scale(1);
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.9);
          }
        }
        @keyframes damage-float-heal {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
          35% {
            transform: translate(-50%, -50%) scale(1);
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -110%) scale(0.95);
          }
        }
      `}</style>
    </>
  );
};
