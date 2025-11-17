// DamageFloater.tsx

import React, { useEffect, useState } from "react";

export type DamageFloat = {
  id: string;
  target: string; // uniqueId or 'playerHero' | 'enemyHero'
  amount: number;
  x: number;
  y: number;
};

export const DamageFloater: React.FC<{
  floats: DamageFloat[];
}> = ({ floats }) => {
  return (
    <>
      {floats.map((f) => (
        <span
          key={f.id}
          style={{
            position: "fixed",
            left: f.x,
            top: f.y,
            color: f.amount > 0 ? "#e53935" : "#43a047",
            fontWeight: 900,
            fontSize: 40,
            pointerEvents: "none",
            textShadow: "0 2px 8px #000, 0 0 2px #fff",
            zIndex: 3000,
            animation: "damage-float 0.8s cubic-bezier(.4,2,.6,1) forwards"
          }}
        >
          {f.amount > 0 ? `-${f.amount}` : `+${-f.amount}`}
        </span>
      ))}
      <style>{`
        @keyframes damage-float {
          0% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-40px); }
        }
      `}</style>
    </>
  );
};
