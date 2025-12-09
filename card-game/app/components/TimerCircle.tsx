// TimerCircle.tsx
"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import styles from "@/app/assets/css/Game.Master.module.css";
import { clsx } from "clsx"; // clsxをインポート


// 制御用のインターフェースを定義
export interface TimerController {
  start: () => void;
  reset: () => void;
}

interface TimerProps {
  duration: number;
  isPlayerTurn: boolean;
  isTimerActive: boolean;
  type: "player" | "enemy";
}

const CircularTimer = forwardRef<TimerController, TimerProps>(({ duration, isPlayerTurn, isTimerActive, type }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = cardRef.current!;
    const progress = root.querySelector(`.${styles.progress}`) as SVGCircleElement;
    const timeLabel = root.querySelector("#timeLabel") as HTMLElement;

    const DURATION = duration; 
    const R = 40;
    const C = 2 * Math.PI * R;

    let remaining = DURATION;
    let startTs: number | null = null;
    let paused = true;
    let rafId: number | null = null;

    progress.setAttribute("strokeDasharray", String(C));
    timeLabel.textContent = String(Math.ceil(remaining));
    setProgress(0); 

    function setProgress(ratio: number) {
        const offset = C * (1 - ratio);
        progress.style.strokeDashoffset = String(offset);

        const rem = DURATION * (1 - ratio); 
        progress.classList.remove(styles.warn, styles.critical); 
        if (rem <= Math.max(1, DURATION * 0.15)) {
            progress.classList.add(styles.critical);
        } else if (rem <= Math.max(2, DURATION * 0.3)) {
            progress.classList.add(styles.warn);
        }
    }

    function tick(now: number) {
        if (startTs === null) startTs = now;
        const elapsed = (now - startTs) / 1000;
        let ratio = elapsed / DURATION; 

        if (ratio >= 1) ratio = 1;
        const rem = Math.max(0, DURATION - elapsed); 
        timeLabel.textContent = String(Math.ceil(rem));
        setProgress(ratio);

        if (ratio < 1 && !paused) {
            rafId = requestAnimationFrame(tick);
        } else if (ratio >= 1) {
            onTimerEnd();
        }
    }

    function start() {
        if (!paused) return;
        paused = false;
        startTs = performance.now() - ((DURATION - remaining) * 1000); 
        rafId = requestAnimationFrame(tick);
    }

    function pause() {
        if (paused) return;
          paused = true;
          cancelAnimationFrame(rafId!);

        const now = performance.now();
        if (startTs !== null) { 
            const elapsed = (now - startTs) / 1000;
            remaining = Math.max(0, DURATION - elapsed); 
        }
    }

    function reset() {
        paused = true;
        cancelAnimationFrame(rafId!);
        remaining = DURATION; 
        startTs = null;
        timeLabel.textContent = String(Math.ceil(remaining));
        setProgress(0);
        progress.classList.remove(styles.critical, styles.warn); 
    }

    function onTimerEnd() {
        paused = true;
        cancelAnimationFrame(rafId!);
        timeLabel.textContent = "0";

        progress.classList.remove(styles.warn);
        progress.classList.add(styles.critical);
        
        progress.animate(
            [
                { filter: "drop-shadow(0 6px 8px rgba(217,83,79,0.22))", transform: "scale(1.02)" },
                { filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.08))", transform: "scale(1)" }
            ],
            { duration: 400, iterations: 2 }
        );
    }

    // propのisPlayerTurnが変化したときの動作
    if (isPlayerTurn) {
      if (isTimerActive) {
          start();
      } else {
          pause();
      }
    } else {
      reset(); 
    }

    return () => {
      cancelAnimationFrame(rafId!);
    };
  }, [duration, isPlayerTurn, isTimerActive, styles]);


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