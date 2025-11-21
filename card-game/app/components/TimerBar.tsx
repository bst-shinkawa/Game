import React from 'react';

interface TimerBarProps {
  secondsRemaining: number;
  maxTime: number; 
}

const TimerBar: React.FC<TimerBarProps> = ({ secondsRemaining, maxTime }) => {
  // 残りの割合を計算 (0% から 100%)
  const percentage = (secondsRemaining / maxTime) * 100;
  const isWarning = secondsRemaining <= 10; // 警告フラグ

  return (
    // CSS Module を使用する場合は className を修正してください
    <div className="timer_bar_container"> 
      <div 
        className={`timer_bar ${isWarning ? 'warning' : ''}`}
        style={{ width: `${percentage}%` }}
      >
      </div>
    </div>
  );
};

export default TimerBar;