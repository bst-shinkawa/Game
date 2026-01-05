// TimerCircle.tsx
"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import styles from "@/app/assets/css/Game.Master.module.css";
import { TurnTimer } from "@/app/data/turnTimer";
import { clsx } from "clsx"; // clsxをインポート


// 制御用のインターフェースを定義
export interface TimerController {
  start: () => void;
  pause: () => void;
  reset: () => void;
}

interface TimerProps {
  duration: number;
  isPlayerTurn: boolean;
  isTimerActive: boolean;
  type: "player" | "enemy";
  timer?: TurnTimer | null;
}

const CircularTimer = forwardRef<TimerController, TimerProps>(({ duration, isPlayerTurn, isTimerActive, type, timer }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = cardRef.current!;
    const progress = root.querySelector(`.${styles.progress}`) as SVGCircleElement;
    const timeLabel = root.querySelector("#timeLabel") as HTMLElement;

    const DURATION = duration; 
    const R = 40;
    const C = 2 * Math.PI * R;

    progress.setAttribute("strokeDasharray", String(C));
    timeLabel.textContent = String(Math.ceil(DURATION));
    setProgress(1);

    function setProgress(ratio: number) {
      const offset = C * (1 - ratio);
      progress.style.strokeDashoffset = String(offset);

      const rem = Math.max(0, Math.ceil(ratio * DURATION));
      progress.classList.remove(styles.warn, styles.critical);
      if (rem <= Math.max(1, DURATION * 0.15)) {
        progress.classList.add(styles.critical);
      } else if (rem <= Math.max(2, DURATION * 0.3)) {
        progress.classList.add(styles.warn);
      }
    }

    // subscribe to external timer if provided
    let offTick: (() => void) | undefined;
    let offEnd: (() => void) | undefined;

    if (typeof timer !== 'undefined' && timer !== null) {
      offTick = timer.onTick((remainingSeconds) => {
        const ratio = remainingSeconds / DURATION;
        timeLabel.textContent = String(Math.ceil(remainingSeconds));
        setProgress(ratio);
      });

      offEnd = timer.onEnd(() => {
        timeLabel.textContent = "0";
        setProgress(0);
        progress.classList.remove(styles.warn);
        progress.classList.add(styles.critical);
        progress.animate(
          [
            { filter: "drop-shadow(0 6px 8px rgba(217,83,79,0.22))", transform: "scale(1.02)" },
            { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.08))", transform: "scale(1)" }
          ],
          { duration: 400, iterations: 2 }
        );
      });
    }

    // connect refs to external timer control if available
    startRef.current = () => { if (timer) timer.start(); };
    pauseRef.current = () => { if (timer) timer.pause(); };
    resetRef.current = () => { if (timer) { timer.reset(); } else { timeLabel.textContent = String(Math.ceil(DURATION)); setProgress(1); } };

    // legacy props compatibility (visual pause/reset)
    if (!timer) {
      // fall back to previous behavior
      setProgress(1);
    }

    return () => {
      if (offTick) offTick();
      if (offEnd) offEnd();
    };
  }, [duration, timer, styles]);

  // 外部から start/pause/reset を呼べるようにする
  useImperativeHandle(ref, () => ({
    start: () => startRef.current(),
    pause: () => pauseRef.current(),
    reset: () => resetRef.current(),
  }), []);


  // typeに基づいてCSSクラスのベース名を決定
  // field_player_timer または field_enemy_timer
  const baseClass = type === 'player' ? 'field_player_timer' : 'field_enemy_timer';

  return (
    // ブラケット記法 (styles[baseClass]) を使用して動的にCSSクラスを適用
    <div className={styles[baseClass]}>
      <div ref={cardRef}>
        <div className={styles[`${baseClass}_card`]} role="region" aria-label="ターンタイマー">
          <svg className={styles[`${baseClass}_timer`]} viewBox="0 0 100 100" aria-hidden="true">
            <circle className={styles.track} cx="50" cy="50" r="40"></circle>
            <circle className={styles.progress} cx="50" cy="50" r="40" strokeDasharray="251.2" strokeDashoffset="0"></circle>
          </svg>
          <div className={styles[`${baseClass}_time_label`]} id="timeLabel">10</div>
        </div>
      </div>
    </div>
  );
});

// forwardRefでラップしたコンポーネントをエクスポートする
export default CircularTimer;